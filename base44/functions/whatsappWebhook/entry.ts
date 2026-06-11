import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);

        // Verificação do webhook pela Meta (GET)
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');
            if (mode === 'subscribe' && token && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
                return new Response(challenge, { status: 200 });
            }
            return new Response('Forbidden', { status: 403 });
        }

        const base44 = createClientFromRequest(req);
        const svc = base44.asServiceRole;
        const body = await req.json();

        const messages = [];
        for (const entry of body?.entry || []) {
            for (const change of entry?.changes || []) {
                for (const msg of change?.value?.messages || []) {
                    messages.push(msg);
                }
            }
        }

        // Hoje no fuso de Brasília (UTC-3)
        const today = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

        for (const msg of messages) {
            const from = String(msg.from || '').replace(/\D/g, '');
            const text = msg.text?.body || '';
            if (!from) continue;

            let entries = await svc.entities.WaitlistEntry.filter({
                customer_phone: from,
                service_date: today,
            });
            entries = entries.filter((e) => e.status === 'aguardando' || e.status === 'chamado');
            if (entries.length === 0) continue;

            // "Quero entrar na fila - Atlântica" → resolve a loja pelo identificador
            let entry = entries[0];
            const match = text.match(/fila\s*-\s*(.+)$/i);
            if (match) {
                const storeName = match[1].trim().toLowerCase();
                const restaurants = await svc.entities.Restaurant.list();
                const store = restaurants.find(
                    (r) =>
                        (r.name || '').toLowerCase().includes(storeName) ||
                        storeName.includes((r.name || '').toLowerCase())
                );
                if (store) {
                    const sameStore = entries.find((e) => e.restaurant_id === store.id);
                    if (sameStore) entry = sameStore;
                }
            }

            // Abre a janela de serviço de 24h (respostas gratuitas)
            await svc.entities.WaitlistEntry.update(entry.id, {
                whatsapp_opt_in: true,
                whatsapp_window_opened_at: new Date().toISOString(),
            });

            const [restaurant] = await svc.entities.Restaurant.filter({ id: entry.restaurant_id });

            // Posição na fila (prioridade primeiro, depois ordem de chegada)
            const waiting = (
                await svc.entities.WaitlistEntry.filter({
                    restaurant_id: entry.restaurant_id,
                    service_date: today,
                    status: 'aguardando',
                })
            ).sort(
                (a, b) =>
                    (b.priority === true) - (a.priority === true) ||
                    new Date(a.created_date) - new Date(b.created_date)
            );
            const position = waiting.findIndex((e) => e.id === entry.id) + 1;

            const settingsList = await svc.entities.WhatsAppSettings.list();
            const appUrl = (settingsList[0]?.app_url || '').replace(/\/$/, '');
            const statusLink = appUrl ? ` Acompanhe em tempo real: ${appUrl}/fila/${entry.restaurant_id}` : '';
            const positionText =
                entry.status === 'chamado'
                    ? 'Sua mesa está pronta!'
                    : position > 0
                    ? `Você está na posição ${position} da fila.`
                    : 'Você está na fila.';
            const replyText = `${restaurant?.name || ''}: Pronto, ${entry.customer_name}! ${positionText} Vamos te avisar por aqui quando sua mesa estiver pronta.${statusLink}`;

            const token = Deno.env.get('WHATSAPP_TOKEN');
            const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
            const logBase = {
                restaurant_id: entry.restaurant_id,
                customer_phone: from,
                type: 'fila_entrada',
                channel: 'whatsapp',
                related_entity_type: 'waitlist',
                related_entity_id: entry.id,
                message_preview: replyText.slice(0, 200),
            };

            if (!token || !phoneNumberId) {
                await svc.entities.NotificationLog.create({
                    ...logBase,
                    status: 'falhou',
                    error_message: 'credenciais não configuradas',
                });
                continue;
            }

            const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: from,
                    type: 'text',
                    text: { body: replyText },
                }),
            });

            if (res.ok) {
                await svc.entities.NotificationLog.create({
                    ...logBase,
                    status: 'enviado',
                    sent_at: new Date().toISOString(),
                });
            } else {
                const errText = await res.text();
                await svc.entities.NotificationLog.create({
                    ...logBase,
                    status: 'falhou',
                    error_message: errText.slice(0, 500),
                });
            }
        }

        return Response.json({ ok: true });
    } catch (error) {
        // Sempre responder 200 para a Meta não reenviar indefinidamente
        return Response.json({ ok: false, error: error.message });
    }
});