import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function normalizePhone(input) {
    const digits = String(input || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    return '55' + digits;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const svc = base44.asServiceRole;
        const payload = await req.json();
        const { restaurant_id, phone, type, related_entity_type, related_entity_id, text, template } = payload;

        const to = normalizePhone(phone);
        if (!restaurant_id || !to || !type || !related_entity_type || !related_entity_id) {
            return Response.json({ sent: false, error: 'Parâmetros inválidos' });
        }

        const [restaurant] = await svc.entities.Restaurant.filter({ id: restaurant_id });
        if (!restaurant) {
            return Response.json({ sent: false, error: 'Restaurante não encontrado' });
        }

        // Anti-abuso: o registro relacionado deve existir e bater com restaurante + telefone
        const entityName = related_entity_type === 'reservation' ? 'Reservation' : 'WaitlistEntry';
        const [related] = await svc.entities[entityName].filter({ id: related_entity_id });
        if (!related || related.restaurant_id !== restaurant_id || normalizePhone(related.customer_phone) !== to) {
            return Response.json({ sent: false, error: 'Registro relacionado inválido' });
        }

        const log = async (status, extra = {}) => {
            await svc.entities.NotificationLog.create({
                restaurant_id,
                customer_phone: to,
                type,
                channel: 'whatsapp',
                related_entity_type,
                related_entity_id,
                status,
                ...extra,
            });
        };

        const token = Deno.env.get('WHATSAPP_TOKEN');
        const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

        // Toda mensagem começa com o nome do restaurante (número compartilhado entre lojas)
        let preview;
        let body;
        if (template) {
            const settingsList = await svc.entities.WhatsAppSettings.list();
            const templateName = settingsList[0]?.template_name || 'confirmacao_reserva';
            const params = [restaurant.name, ...(template.params || [])];
            preview = `template ${templateName}: ${params.join(' | ')}`.slice(0, 200);
            body = {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'pt_BR' },
                    components: [
                        {
                            type: 'body',
                            parameters: params.map((p) => ({ type: 'text', text: String(p) })),
                        },
                    ],
                },
            };
        } else {
            const fullText = `${restaurant.name}: ${text || ''}`;
            preview = fullText.slice(0, 200);
            body = { messaging_product: 'whatsapp', to, type: 'text', text: { body: fullText } };
        }

        if (!token || !phoneNumberId) {
            await log('falhou', { message_preview: preview, error_message: 'credenciais não configuradas' });
            return Response.json({ sent: false, error: 'credenciais não configuradas' });
        }

        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text();
            await log('falhou', { message_preview: preview, error_message: errText.slice(0, 500) });
            return Response.json({ sent: false });
        }

        await log('enviado', { message_preview: preview, sent_at: new Date().toISOString() });
        return Response.json({ sent: true });
    } catch (error) {
        // Nunca quebrar o fluxo do chamador por falha de envio
        return Response.json({ sent: false, error: error.message });
    }
});