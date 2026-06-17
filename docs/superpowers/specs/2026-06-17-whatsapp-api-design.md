# Design — Integração WhatsApp automático (Meta Cloud API) com janela de 24h

Data: 2026-06-17
Projeto: Reservas Pizza Bis (React + Vite + Supabase, deploy Vercel)

## Objetivo

Substituir o envio manual de WhatsApp (`window.open("https://wa.me/...")`) por envio
**automático** via Meta WhatsApp Cloud API, **minimizando custo** ao usar a janela de
24h (mensagens de texto livre são gratuitas quando o cliente inicia a conversa).

Dois eventos:
1. **Fila — "É a sua vez"**: operador clica "Mesa Pronta" → cliente recebe o aviso.
2. **Confirmação de reserva**: operador clica "Confirmar" (status → `confirmada`) → cliente recebe.

Em ambos: se o telefone tem **janela aberta** (cliente mandou msg < 24h), envia **texto
livre grátis**; senão envia **template** (custo baixo); se falhar, **botão manual wa.me**
permanece como fallback.

## Contexto atual

- `src/lib/whatsapp.js` modela envio (templates, opt-in, janela 24h, log) mas importa
  `@/functions/sendWhatsApp` — módulo **inexistente** (resíduo Base44).
- `notifyReservationConfirmation` usa `reservation.time` — **não existe mais** (migramos
  para `start_min`, inteiro = minutos desde meia-noite). Corrigir com `fromMinutes`.
- `WaitlistList.handleCall` marca `chamado` + `called_at` e abre `wa.me` manual.
- Segurança: anon sem acesso direto às tabelas (RLS + RPC, ver `supabase_security.sql`).
- `waitlist_entries` já tem `whatsapp_opt_in` e `whatsapp_window_opened_at` (não usaremos
  esses; a janela passa a ser rastreada por telefone — ver abaixo).

## Regras da Meta (restrições, não escolhas)

- Texto livre só é permitido (e gratuito) dentro de **24h** desde a última mensagem do
  cliente. Fora disso → **template aprovado** (categoria Utility, ~1-2 dias p/ aprovar).
- Webhook de inbound exige verificação (handshake GET) e validação de assinatura
  (`X-Hub-Signature-256` com o App Secret).

## Arquitetura

### Fluxo de opt-in (abre a janela)
```
Cliente entra na fila/reserva pelo site (RPC público) → tela de sucesso
  → botão "Ativar avisos no WhatsApp" → wa.me/<NUMERO_NEGOCIO>?text=<msg pronta>
  → cliente envia → Meta chama api/whatsapp-webhook (POST)
      → valida assinatura → casa pelo telefone (from) → register_whatsapp_optin(phone, restaurant_id)
      → (opcional) auto-reply "Pronto! Vou te avisar por aqui 🍕" (grátis, dentro da janela)
```

### Fluxo de envio
```
Operador: "Mesa Pronta" / "Confirmar"
  → Frontend chama POST /api/send-whatsapp (Authorization: Bearer <JWT operador>)
      → valida JWT (auth.getUser)
      → has_whatsapp_window(phone)?
           sim → envia TEXTO LIVRE (type:text) — grátis
           não → envia TEMPLATE (type:template) — custo baixo
      → grava notification_log (status, erro, provider_message_id)
      → responde { ok, error? }
  → Frontend: ok segue; falhou → botão manual wa.me
```

Envio é **fire-and-forget**: nunca bloqueia marcar mesa/confirmar reserva.

### Segredos (painel Vercel)
- `WHATSAPP_TOKEN` — token permanente (System User, `whatsapp_business_messaging`)
- `WHATSAPP_PHONE_NUMBER_ID` — ID do número
- `WHATSAPP_VERIFY_TOKEN` — string que escolhemos, usada no handshake GET do webhook
- `WHATSAPP_APP_SECRET` — App Secret da Meta, p/ validar assinatura do POST
- (frontend) `VITE_WHATSAPP_BUSINESS_NUMBER` — número do negócio p/ o link wa.me de opt-in
- (já existentes) `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **NÃO** usa service_role: webhook grava opt-in via RPC SECURITY DEFINER com a anon key.

## Componentes

### Backend (novas funções Vercel, runtime Node)

**`api/send-whatsapp.js`**
- Entrada JSON: `{ restaurant_id, phone, type, related_entity_type, related_entity_id,
  text?, template?: { name, params: [] } }`.
- Valida `Authorization: Bearer <jwt>` via `supabase.auth.getUser(jwt)` (anon key + header).
  Rejeita não autenticado.
- `phone` ausente/inválido (< 12 dígitos) → não envia, log `ignorado`, `{ ok:false, skipped:true }`.
- Decide via RPC `has_whatsapp_window(phone)`:
  - aberto → Cloud API `type:"text"` com `text.body` (mensagem livre).
  - fechado → Cloud API `type:"template"`, `language:{code:"pt_BR"}`, `components` com params.
- POST `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`.
- Grava `notification_log` (status `enviado`/`falhou`/`ignorado`, erro, provider_message_id),
  usando client Supabase com o JWT do operador (RLS `staff_all` cobre `notification_log`).
- Retorna `{ ok, error? }`. Nunca lança para o cliente.

**`api/whatsapp-webhook.js`**
- **GET**: responde `hub.challenge` se `hub.verify_token === WHATSAPP_VERIFY_TOKEN`.
- **POST**: valida `X-Hub-Signature-256` (HMAC SHA256 do corpo com `WHATSAPP_APP_SECRET`).
  Extrai `from` (número do cliente). Chama RPC `register_whatsapp_optin(from, restaurant_id)`.
  (restaurant_id: na v1 há uma única unidade; resolver pela única unidade ou por mapeamento
  do phone_number_id → restaurante.) Responde 200 rápido. Auto-reply é opcional (v1: pode pular).

### Backend (SQL — `supabase_security.sql` ganha uma seção, ou arquivo novo)

- Tabela `whatsapp_optins (phone text, restaurant_id uuid, opened_at timestamptz, primary key(phone, restaurant_id))`.
  RLS ligado; sem acesso direto a anon (só via RPC).
- `register_whatsapp_optin(p_phone text, p_restaurant_id uuid)` — SECURITY DEFINER,
  upsert `opened_at = now()`. `grant execute` a `anon` (o webhook usa anon key) — risco baixo
  (só marca opt-in; envios reais são limitados a entradas existentes).
- `has_whatsapp_window(p_phone text)` returns boolean — SECURITY DEFINER, `true` se existe
  opt-in com `opened_at > now() - interval '24 hours'`. `grant execute` a `authenticated`.

### Frontend (ajustes)

- **`src/functions/sendWhatsApp.js`** (novo): pega token de `supabase.auth.getSession()`,
  `fetch("/api/send-whatsapp", { method, headers:{Authorization}, body })`, retorna JSON.
- **`src/lib/whatsapp.js`**:
  - `notifyQueueCall(entry)` → monta `text` (livre) E `template` (`fila_chamada`, params
    `[name, party_size]`); a função decide qual usar pela janela. Passa ambos no payload.
  - Corrigir `notifyReservationConfirmation(res)` → `start_min`→"HH:MM" via `fromMinutes`;
    `text` livre + `template` `reserva_confirmacao` (params `[name, dd/mm/aaaa, HH:MM, party_size]`).
- **`src/components/public/QueueStatusCard.jsx`**: botão "📱 Ativar avisos no WhatsApp" →
  `https://wa.me/${VITE_WHATSAPP_BUSINESS_NUMBER}?text=...` (msg pronta).
- **`src/pages/public/ReservePage.jsx`** (tela de sucesso): mesmo botão de opt-in.
- **`src/components/operator/WaitlistList.jsx`**: `handleCall` → após `chamado`, chama
  `notifyQueueCall`. Botão "WhatsApp" (wa.me) permanece como fallback manual.
- **`src/components/operator/ReservationList.jsx`**: botão "Confirmar" → `notifyReservationConfirmation`.

## Templates Meta (criados pelo usuário; usados só como fallback fora da janela)

1. **`fila_chamada`** (Utility, pt_BR):
   > Olá {{1}}! 🎉 Sua vez chegou! Sua mesa para {{2}} pessoa(s) está pronta. Por favor, dirija-se à recepção.
2. **`reserva_confirmacao`** (Utility, pt_BR):
   > Olá {{1}}! Sua reserva na Pizza Bis está confirmada para {{2}} às {{3}}, para {{4}} pessoa(s). Até logo! 🍕

## Dados — notification_log

Grava cada tentativa: `restaurant_id`, `phone`, `type`, `related_entity_type`,
`related_entity_id`, `template` (nome ou null se texto livre), `status`
(`enviado`/`falhou`/`ignorado`), `error`, `provider_message_id`, `created_at`.

**A verificar na implementação:** colunas reais de `notification_log` (anon não lê). Se
faltarem `status`/`error`/`provider_message_id`, adicionar via SQL antes de usar.

## Tratamento de erro

- Frontend (`notifyWhatsApp`) é try/catch fire-and-forget — falha nunca propaga.
- Funções sempre respondem JSON e registram desfechos.
- Telefone ausente/inválido → `ignorado`, sem chamada à Meta.
- Erro Meta (template não aprovado, número inválido, token expirado) → `falhou` + motivo;
  operador usa botão manual.
- Webhook: assinatura inválida → 401; qualquer erro interno → 200 mesmo assim (não fazer
  a Meta reenviar em loop), com log.

## Testes

- **Pré-requisito:** templates aprovados + número + token/IDs na Vercel + webhook configurado.
- Webhook: testar handshake GET; enviar mensagem real ao número e ver opt-in registrado.
- Envio: `curl` no endpoint com JWT de operador (número de teste da Meta); validar texto
  livre (janela aberta) e template (janela fechada).
- Ponta a ponta: fila → opt-in → "Mesa Pronta" → recebe grátis; reserva → "Confirmar".
- Conferir linhas em `notification_log` e `whatsapp_optins`.

## Fora de escopo (v1)

- Lembrete de reserva (precisa cron).
- Mensagem "entrou na fila".
- Status de entrega (delivery/read receipts) via webhook.
- Bot conversacional (entrar na fila/reservar inteiramente pelo WhatsApp).
- Multi-unidade no roteamento do webhook (v1 assume unidade única / mapeamento simples).
