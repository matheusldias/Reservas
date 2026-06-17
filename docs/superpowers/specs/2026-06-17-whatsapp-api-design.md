# Design — Integração WhatsApp automático (Meta Cloud API)

Data: 2026-06-17
Projeto: Reservas Pizza Bis (React + Vite + Supabase, deploy Vercel)

## Objetivo

Substituir o envio manual de WhatsApp (hoje `window.open("https://wa.me/...")`) por
envio **automático** via Meta WhatsApp Cloud API, para dois eventos:

1. **Fila — "É a sua vez"**: ao operador clicar em "Mesa Pronta", o cliente recebe
   automaticamente a mensagem avisando que a mesa está pronta.
2. **Confirmação de reserva**: ao operador clicar em "Confirmar" numa reserva
   (status → `confirmada`), o cliente recebe a confirmação.

O botão manual `wa.me` permanece como **fallback** quando o envio automático falhar
ou não for possível.

## Contexto atual

- `src/lib/whatsapp.js` já modela o envio (templates, opt-in, janela 24h, log), mas
  importa `@/functions/sendWhatsApp` — módulo que **não existe** (resíduo do Base44).
- `notifyReservationConfirmation` usa `reservation.time` — campo que **não existe mais**
  (migramos para `start_min`, inteiro = minutos desde meia-noite).
- `WaitlistList.handleCall` marca `chamado` + `called_at` e abre `wa.me` manualmente.
- Não há acesso direto do anon às tabelas (segurança via RLS + RPC — ver
  `supabase_security.sql`). A função de WhatsApp roda como **operador autenticado**.

## Restrições da Meta (não são escolhas, são regras)

- Cliente que **não** mandou mensagem nas últimas 24h só pode receber **template aprovado**.
  Ambos os casos (fila/reserva) caem nessa regra → exigem templates.
- Templates levam ~1-2 dias para aprovação (categoria "Utility").

## Arquitetura

```
Operador (autenticado)
  → Frontend chama POST /api/send-whatsapp  (Authorization: Bearer <JWT do operador>)
      → Função Vercel api/send-whatsapp.js
          1. valida JWT no Supabase (auth.getUser) — rejeita se não autenticado
          2. monta payload de template e chama Meta Cloud API
             POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
          3. grava resultado em notification_log (enviado/falhou + erro)
          4. responde { ok, error? }
  → Frontend: ok → segue; falhou → mostra/permite botão manual wa.me
```

Envio é **fire-and-forget**: nunca bloqueia o fluxo de marcar mesa/confirmar reserva.

### Segredos (painel Vercel → Environment Variables)
- `WHATSAPP_TOKEN` — token permanente (System User, permissão `whatsapp_business_messaging`)
- `WHATSAPP_PHONE_NUMBER_ID` — ID do número
- (já existentes) `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — a função usa a URL +
  anon key para validar o JWT e gravar o log com as permissões do próprio operador
  (RLS `staff_all` já cobre `notification_log` para `authenticated`). **Não usa service_role.**

## Componentes

### Novos
- **`api/send-whatsapp.js`** (função serverless Vercel, runtime Node)
  - Entrada (JSON): `{ restaurant_id, phone, type, related_entity_type, related_entity_id,
    template: { name, params: [] } }`
  - Valida `Authorization: Bearer <jwt>` via `supabase.auth.getUser(jwt)`.
  - Se `phone` ausente/inválido (< 12 dígitos): não envia, grava log `ignorado`, retorna `{ ok:false, skipped:true }`.
  - Chama Meta Cloud API com `type: "template"`, `language: { code: "pt_BR" }`,
    `components` com os parâmetros do corpo.
  - Grava `notification_log` (status `enviado`/`falhou`/`ignorado`, erro, id da mensagem).
  - Retorna `{ ok, error? }`. Nunca lança para o cliente.

- **`src/functions/sendWhatsApp.js`**
  - `export async function sendWhatsApp(payload)`: pega o token via
    `supabase.auth.getSession()`, faz `fetch("/api/send-whatsapp", { headers: Authorization, body })`.
  - Retorna o JSON da função. Erros são tratados pelo chamador (`notifyWhatsApp` já é try/catch).

### Ajustados
- **`vercel.json`** — o rewrite catch-all passa a **excluir** `/api/*`
  (ex.: `"source": "/((?!api/).*)"`), senão a função nunca é alcançada.
- **`src/lib/whatsapp.js`**
  - Adicionar `notifyQueueCall(entry)` → template `fila_chamada`, params `[customer_name, party_size]`.
  - Corrigir `notifyReservationConfirmation` → usar `start_min` convertido para "HH:MM"
    (via `fromMinutes` de `@/lib/capacity`) no lugar de `reservation.time`; template
    `reserva_confirmacao`, params `[customer_name, dd/mm/aaaa, HH:MM, party_size]`.
- **`src/components/operator/WaitlistList.jsx`**
  - `handleCall`: após marcar `chamado`, chamar `notifyQueueCall(entry)` (automático).
  - Botão "WhatsApp" (wa.me) permanece como fallback manual nos cards `chamado`.
- **`src/components/operator/ReservationList.jsx`**
  - No botão "Confirmar" (status → `confirmada`), chamar `notifyReservationConfirmation(res)`.

## Templates Meta (criados pelo usuário no WhatsApp Manager)

1. **`fila_chamada`** (Utility, pt_BR)
   > Olá {{1}}! 🎉 Sua vez chegou! Sua mesa para {{2}} pessoa(s) está pronta. Por favor, dirija-se à recepção.
2. **`reserva_confirmacao`** (Utility, pt_BR)
   > Olá {{1}}! Sua reserva na Pizza Bis está confirmada para {{2}} às {{3}}, para {{4}} pessoa(s). Até logo! 🍕

## Dados — notification_log

A função grava cada tentativa. Colunas usadas/esperadas: `restaurant_id`, `phone`,
`type`, `related_entity_type`, `related_entity_id`, `template` (nome), `status`
(`enviado`/`falhou`/`ignorado`), `error`, `provider_message_id`, `created_at`.

**A verificar na implementação:** as colunas reais de `notification_log` (anon não lê).
Se faltarem `status`/`error`/`provider_message_id`, adicionar via SQL antes de usar.

## Tratamento de erro

- Frontend (`notifyWhatsApp`) já é try/catch fire-and-forget — falha nunca propaga.
- Função sempre responde JSON e registra todos os desfechos no log.
- Telefone ausente/inválido → `ignorado`, sem chamada à Meta.
- Erro Meta (template não aprovado, número inválido, token expirado) → `falhou` + motivo;
  operador recorre ao botão manual.

## Testes

- **Pré-requisito:** templates aprovados pela Meta + `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`
  configurados na Vercel.
- Teste do endpoint via `curl` (com JWT de um operador) usando o número de teste da Meta.
- Teste de ponta a ponta pelo app: criar entrada na fila → "Mesa Pronta" → confirmar
  recebimento; criar reserva → "Confirmar" → confirmar recebimento.
- Verificar linhas correspondentes em `notification_log`.

## Fora de escopo (v1)

- Lembrete de reserva (precisa cron/agendamento).
- Mensagem "entrou na fila".
- Webhook de inbound/recebimento de status de entrega (delivery receipts).
- Mensagens de texto livre na janela de 24h / opt-in por palavra-chave.
