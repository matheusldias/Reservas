# WhatsApp Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar avisos de WhatsApp automaticamente (fila "é a sua vez" e confirmação de reserva), usando a janela de 24h para enviar grátis quando o cliente inicia a conversa, com template pago como fallback e botão manual wa.me como último recurso.

**Architecture:** Duas funções serverless na Vercel (`api/send-whatsapp.js` envia; `api/whatsapp-webhook.js` recebe inbound e registra opt-in). Estado de "janela aberta" guardado numa tabela `whatsapp_optins` por telefone, gravada/lida via RPCs SECURITY DEFINER. Frontend dispara o envio nos botões "Mesa Pronta"/"Confirmar" e oferece um botão "Ativar avisos" nas telas públicas de sucesso.

**Tech Stack:** Vercel Serverless Functions (Node, ESM), Supabase (Postgres + RPC), Meta WhatsApp Cloud API v21.0, React + Vite, vitest (novo, só para helpers puros).

## Global Constraints

- Projeto é ESM (`"type": "module"` no package.json) — usar `import`/`export`, nunca `require`.
- Funções Vercel ficam em `api/*.js`; helpers compartilhados em `api/_lib/*.js` (o prefixo `_` evita virar rota). Nada em `api/` pode ser importado pelo frontend (`src/`).
- Cliente Supabase no frontend: `import { supabase } from "@/lib/supabase"`.
- Envio é fire-and-forget: nunca lançar erro que quebre o fluxo de marcar mesa / confirmar reserva.
- Telefone normalizado = só dígitos, formato `55DDNNNNNNNNN` (ver `src/lib/phone.js`, função `normalizePhone`). "Válido" = `length >= 12`.
- Meta Cloud API base: `https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`. Idioma de template: `pt_BR`.
- Segredos (Vercel env): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`. Frontend: `VITE_WHATSAPP_BUSINESS_NUMBER`. Já existentes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. NÃO usar service_role.
- Status gravados em `notification_log`: `enviado` | `falhou` | `ignorado`.

---

### Task 1: Banco — tabela whatsapp_optins, RPCs e colunas do notification_log

**Files:**
- Create: `supabase_whatsapp.sql` (rodado manualmente no Supabase SQL Editor; é gitignored junto com `supabase_security.sql` se preferir manter local — ver passo 4)

**Interfaces:**
- Produces (RPCs chamáveis do app/funções):
  - `register_whatsapp_optin(p_phone text)` returns void — grava/atualiza opt-in (anon pode executar)
  - `has_whatsapp_window(p_phone text)` returns boolean — true se opt-in < 24h (authenticated pode executar)
- Produces (tabela): `whatsapp_optins(phone text primary key, opened_at timestamptz not null)`
- Produces (colunas garantidas em `notification_log`): `status text`, `error text`, `provider_message_id text`

- [ ] **Step 1: Verificar as colunas atuais de notification_log**

No Supabase SQL Editor, rodar:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'notification_log'
order by ordinal_position;
```

Anotar quais destas faltam: `status`, `error`, `provider_message_id`, `template`, `phone`, `type`, `related_entity_type`, `related_entity_id`, `restaurant_id`.

- [ ] **Step 2: Escrever o SQL completo**

Criar `supabase_whatsapp.sql`:

```sql
-- =====================================================================
-- WhatsApp — opt-in (janela 24h) + colunas de log
-- Rodar no Supabase SQL Editor.
-- =====================================================================

-- 1. Tabela de opt-in (janela por telefone)
create table if not exists public.whatsapp_optins (
  phone text primary key,
  opened_at timestamptz not null default now()
);
alter table public.whatsapp_optins enable row level security;
-- sem policies => nenhum acesso direto; só via RPC SECURITY DEFINER
revoke all on public.whatsapp_optins from anon, authenticated;

-- 2. RPC: registrar opt-in (chamada pelo webhook com a anon key)
create or replace function public.register_whatsapp_optin(p_phone text)
returns void
language sql security definer
set search_path = public
as $$
  insert into public.whatsapp_optins (phone, opened_at)
  values (p_phone, now())
  on conflict (phone) do update set opened_at = now();
$$;
revoke all on function public.register_whatsapp_optin(text) from public;
grant execute on function public.register_whatsapp_optin(text) to anon, authenticated;

-- 3. RPC: a janela está aberta? (chamada pela função de envio, autenticada)
create or replace function public.has_whatsapp_window(p_phone text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.whatsapp_optins
    where phone = p_phone and opened_at > now() - interval '24 hours'
  );
$$;
revoke all on function public.has_whatsapp_window(text) from public, anon;
grant execute on function public.has_whatsapp_window(text) to authenticated;

-- 4. Garantir colunas no notification_log (idempotente)
alter table public.notification_log
  add column if not exists status text,
  add column if not exists error text,
  add column if not exists provider_message_id text,
  add column if not exists template text,
  add column if not exists phone text,
  add column if not exists type text,
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid,
  add column if not exists restaurant_id uuid;
```

- [ ] **Step 3: Rodar e validar**

Colar o conteúdo no Supabase SQL Editor e executar. Esperado: "Success. No rows returned".

Validar as RPCs com a anon key (substituir `<ANON>` e `<URL>`):

```bash
curl -s -X POST "<URL>/rest/v1/rpc/register_whatsapp_optin" \
  -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>" \
  -H "Content-Type: application/json" -d '{"p_phone":"5547999999999"}' -w " HTTP %{http_code}"
# Esperado: corpo vazio, HTTP 204

curl -s -X POST "<URL>/rest/v1/rpc/has_whatsapp_window" \
  -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>" \
  -H "Content-Type: application/json" -d '{"p_phone":"5547999999999"}' -w " HTTP %{http_code}"
# Esperado: permission denied (anon não pode) — confirma que só authenticated lê
```

- [ ] **Step 4: Manter o SQL fora do git (consistente com supabase_security.sql)**

Adicionar ao `.gitignore`:

```
supabase_whatsapp.sql
```

```bash
git add .gitignore
git commit -m "chore: gitignore supabase_whatsapp.sql"
```

---

### Task 2: Helpers puros + vitest (montar payload Meta, validar assinatura)

**Files:**
- Create: `api/_lib/whatsapp.js`
- Create: `api/_lib/whatsapp.test.js`
- Modify: `package.json` (devDependency vitest + script `test`)

**Interfaces:**
- Produces:
  - `buildMessagePayload({ phone, windowOpen, text, template })` → objeto pronto pro corpo da Cloud API. Se `windowOpen` true e `text` presente → mensagem `type:"text"`; senão → `type:"template"` (`template.name`, `template.params`).
  - `verifyMetaSignature(rawBody, signatureHeader, appSecret)` → boolean (HMAC SHA256, compara com `sha256=<hex>`).
  - `readRawBody(req)` → Promise<string> (lê o stream da request Node).

- [ ] **Step 1: Instalar vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Adicionar script de teste ao package.json**

Em `"scripts"`, adicionar:

```json
"test": "vitest run",
```

- [ ] **Step 3: Escrever os testes (falhando)**

Criar `api/_lib/whatsapp.test.js`:

```js
import { describe, it, expect } from "vitest";
import { buildMessagePayload, verifyMetaSignature } from "./whatsapp.js";
import crypto from "node:crypto";

describe("buildMessagePayload", () => {
  it("usa texto livre quando a janela está aberta e há texto", () => {
    const p = buildMessagePayload({
      phone: "5547999999999",
      windowOpen: true,
      text: "Sua mesa está pronta!",
      template: { name: "fila_chamada", params: ["Ana", "2"] },
    });
    expect(p).toEqual({
      messaging_product: "whatsapp",
      to: "5547999999999",
      type: "text",
      text: { body: "Sua mesa está pronta!" },
    });
  });

  it("usa template quando a janela está fechada", () => {
    const p = buildMessagePayload({
      phone: "5547999999999",
      windowOpen: false,
      text: "Sua mesa está pronta!",
      template: { name: "fila_chamada", params: ["Ana", "2"] },
    });
    expect(p.type).toBe("template");
    expect(p.template.name).toBe("fila_chamada");
    expect(p.template.language).toEqual({ code: "pt_BR" });
    expect(p.template.components).toEqual([
      { type: "body", parameters: [
        { type: "text", text: "Ana" },
        { type: "text", text: "2" },
      ] },
    ]);
  });

  it("usa template quando não há texto, mesmo com janela aberta", () => {
    const p = buildMessagePayload({
      phone: "5547999999999",
      windowOpen: true,
      template: { name: "fila_chamada", params: ["Ana", "2"] },
    });
    expect(p.type).toBe("template");
  });
});

describe("verifyMetaSignature", () => {
  it("aceita assinatura válida", () => {
    const body = '{"a":1}';
    const secret = "segredo";
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyMetaSignature(body, sig, secret)).toBe(true);
  });

  it("rejeita assinatura inválida", () => {
    expect(verifyMetaSignature('{"a":1}', "sha256=deadbeef", "segredo")).toBe(false);
  });

  it("rejeita header ausente", () => {
    expect(verifyMetaSignature('{"a":1}', undefined, "segredo")).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar os testes e ver falhar**

Run: `npm test`
Expected: FAIL — "Failed to resolve import ./whatsapp.js" ou "buildMessagePayload is not a function".

- [ ] **Step 5: Implementar os helpers**

Criar `api/_lib/whatsapp.js`:

```js
import crypto from "node:crypto";

// Monta o corpo da Meta Cloud API. Texto livre (grátis) se a janela está
// aberta e há texto; senão, template.
export function buildMessagePayload({ phone, windowOpen, text, template }) {
  if (windowOpen && text) {
    return {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    };
  }
  return {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: template.name,
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: (template.params || []).map((t) => ({
            type: "text",
            text: String(t),
          })),
        },
      ],
    },
  };
}

// Valida X-Hub-Signature-256 (HMAC SHA256 do corpo cru com o App Secret).
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Lê o corpo cru da request (necessário p/ validar assinatura).
export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
```

- [ ] **Step 6: Rodar os testes e ver passar**

Run: `npm test`
Expected: PASS (6 testes).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json api/_lib/whatsapp.js api/_lib/whatsapp.test.js
git commit -m "feat: helpers WhatsApp (payload Meta + assinatura) com testes"
```

---

### Task 3: Função de envio (api/send-whatsapp.js)

**Files:**
- Create: `api/send-whatsapp.js`

**Interfaces:**
- Consumes: `buildMessagePayload`, `readRawBody` de `./_lib/whatsapp.js`; RPC `has_whatsapp_window`; env `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Produces: endpoint `POST /api/send-whatsapp`. Body JSON: `{ phone, text, template:{name,params}, type, related_entity_type, related_entity_id, restaurant_id }`. Header `Authorization: Bearer <jwt do operador>`. Retorna `{ ok:boolean, skipped?:boolean, error?:string }`.

- [ ] **Step 1: Instalar o supabase-js para uso nas funções (já é dependência do projeto)**

Verificar que `@supabase/supabase-js` está em `dependencies`:

Run: `grep '@supabase/supabase-js' package.json`
Expected: aparece em dependencies (já está). Se não, `npm install @supabase/supabase-js`.

- [ ] **Step 2: Implementar a função**

Criar `api/send-whatsapp.js`:

```js
import { createClient } from "@supabase/supabase-js";
import { buildMessagePayload } from "./_lib/whatsapp.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }

  // 1. Autenticação: precisa do JWT de um operador logado
  const auth = req.headers.authorization || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return res.status(401).json({ ok: false, error: "sem token" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, error: "não autenticado" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { phone, text, template, type, related_entity_type, related_entity_id, restaurant_id } = body;

  // helper de log (nunca lança)
  const log = async (status, extra = {}) => {
    try {
      await supabase.from("notification_log").insert({
        restaurant_id: restaurant_id || null,
        phone: phone || null,
        type: type || null,
        related_entity_type: related_entity_type || null,
        related_entity_id: related_entity_id || null,
        template: template?.name || null,
        status,
        ...extra,
      });
    } catch { /* log nunca quebra o fluxo */ }
  };

  // 2. Telefone inválido → ignorado
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 12) {
    await log("ignorado", { error: "telefone ausente/inválido" });
    return res.status(200).json({ ok: false, skipped: true });
  }

  // 3. Janela aberta? decide texto livre vs template
  let windowOpen = false;
  try {
    const { data } = await supabase.rpc("has_whatsapp_window", { p_phone: digits });
    windowOpen = data === true;
  } catch { windowOpen = false; }

  if (!windowOpen && !template) {
    await log("ignorado", { error: "janela fechada e sem template" });
    return res.status(200).json({ ok: false, skipped: true });
  }

  // 4. Envia pra Meta
  const payload = buildMessagePayload({ phone: digits, windowOpen, text, template });
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const json = await r.json();
    if (!r.ok) {
      await log("falhou", { error: JSON.stringify(json?.error || json).slice(0, 500) });
      return res.status(200).json({ ok: false, error: "meta_error" });
    }
    await log("enviado", { provider_message_id: json?.messages?.[0]?.id || null });
    return res.status(200).json({ ok: true });
  } catch (e) {
    await log("falhou", { error: String(e).slice(0, 500) });
    return res.status(200).json({ ok: false, error: "exception" });
  }
}
```

- [ ] **Step 3: Verificar que compila (lint)**

Run: `npm run lint`
Expected: sem erros novos em `api/send-whatsapp.js`. (Se o eslint não cobrir `api/`, ao menos confirmar que `node --check api/send-whatsapp.js` passa.)

Run: `node --check api/send-whatsapp.js`
Expected: sem saída (sintaxe ok).

- [ ] **Step 4: Commit**

```bash
git add api/send-whatsapp.js
git commit -m "feat: funcao serverless de envio WhatsApp (texto livre/template + log)"
```

> Verificação de ponta a ponta (curl com JWT real + número de teste Meta) acontece na Task 7, após secrets configurados na Vercel.

---

### Task 4: Webhook (api/whatsapp-webhook.js)

**Files:**
- Create: `api/whatsapp-webhook.js`

**Interfaces:**
- Consumes: `verifyMetaSignature`, `readRawBody` de `./_lib/whatsapp.js`; RPC `register_whatsapp_optin`; env `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Produces: endpoint `GET /api/whatsapp-webhook` (handshake) e `POST /api/whatsapp-webhook` (inbound → registra opt-in).

- [ ] **Step 1: Desativar o body parser automático (precisamos do corpo cru)**

A função lê o corpo cru. Vercel, por padrão, pode pré-parsear. Garantir leitura crua exportando config:

(incluído no arquivo abaixo via `export const config`)

- [ ] **Step 2: Implementar a função**

Criar `api/whatsapp-webhook.js`:

```js
import { createClient } from "@supabase/supabase-js";
import { verifyMetaSignature, readRawBody } from "./_lib/whatsapp.js";

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

export default async function handler(req, res) {
  // 1. Handshake de verificação da Meta
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("forbidden");
  }

  if (req.method !== "POST") {
    return res.status(405).send("method not allowed");
  }

  // 2. Lê corpo cru e valida assinatura
  const raw = await readRawBody(req);
  const signature = req.headers["x-hub-signature-256"];
  if (!verifyMetaSignature(raw, signature, APP_SECRET)) {
    return res.status(401).send("invalid signature");
  }

  // 3. Extrai o telefone do remetente e registra opt-in.
  //    Erros internos respondem 200 (evita reenvio em loop pela Meta).
  try {
    const data = JSON.parse(raw);
    const messages =
      data?.entry?.[0]?.changes?.[0]?.value?.messages || [];
    const from = messages[0]?.from; // número do cliente, só dígitos
    if (from) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
      await supabase.rpc("register_whatsapp_optin", { p_phone: from });
    }
  } catch {
    /* ignora; já respondemos 200 abaixo */
  }
  return res.status(200).send("ok");
}
```

- [ ] **Step 3: Verificar sintaxe**

Run: `node --check api/whatsapp-webhook.js`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add api/whatsapp-webhook.js
git commit -m "feat: webhook WhatsApp (handshake + opt-in por telefone)"
```

---

### Task 5: Roteamento Vercel + documentação de env

**Files:**
- Modify: `vercel.json`
- Create: `docs/whatsapp-setup.md`

**Interfaces:**
- Produces: rewrite que NÃO captura `/api/*`; checklist de configuração Meta + env.

- [ ] **Step 1: Ajustar o vercel.json para não engolir as rotas /api**

Substituir o conteúdo de `vercel.json` por:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 2: Documentar setup da Meta e variáveis**

Criar `docs/whatsapp-setup.md`:

```markdown
# Configuração WhatsApp (Meta Cloud API)

## Variáveis na Vercel (Settings → Environment Variables)
- `WHATSAPP_TOKEN` — token permanente (System User, permissão whatsapp_business_messaging)
- `WHATSAPP_PHONE_NUMBER_ID` — ID do número (WhatsApp Manager)
- `WHATSAPP_VERIFY_TOKEN` — string à sua escolha (ex.: "pizzabis-verify-2026")
- `WHATSAPP_APP_SECRET` — App Secret (Meta App → Settings → Basic)
- `VITE_WHATSAPP_BUSINESS_NUMBER` — número do negócio só dígitos (ex.: 5544998609126)

## Templates (WhatsApp Manager → Modelos), categoria Utility, idioma pt_BR
- `fila_chamada`: Olá {{1}}! 🎉 Sua vez chegou! Sua mesa para {{2}} pessoa(s) está pronta. Por favor, dirija-se à recepção.
- `reserva_confirmacao`: Olá {{1}}! Sua reserva na Pizza Bis está confirmada para {{2}} às {{3}}, para {{4}} pessoa(s). Até logo! 🍕

## Webhook (Meta App → WhatsApp → Configuration)
- Callback URL: https://<seu-dominio-vercel>/api/whatsapp-webhook
- Verify token: o mesmo de WHATSAPP_VERIFY_TOKEN
- Assinar o campo: messages
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json docs/whatsapp-setup.md
git commit -m "chore: rota /api na Vercel + doc de setup WhatsApp"
```

---

### Task 6: Frontend — módulo de envio e ajustes no whatsapp.js

**Files:**
- Create: `src/functions/sendWhatsApp.js`
- Modify: `src/lib/whatsapp.js` (reescrever)

**Interfaces:**
- Consumes: `supabase.auth.getSession()`; `fromMinutes` de `@/lib/capacity`.
- Produces:
  - `sendWhatsApp(payload)` → chama `POST /api/send-whatsapp` com o token da sessão; retorna `{ ok, ... }`.
  - `notifyQueueCall(entry)` → dispara template `fila_chamada` + texto livre equivalente.
  - `notifyReservationConfirmation(reservation)` → dispara `reserva_confirmacao` + texto livre; usa `start_min`.

- [ ] **Step 1: Criar o módulo que faltava (src/functions/sendWhatsApp.js)**

```js
import { supabase } from "@/lib/supabase";

// Chama a função serverless de envio, autenticando com o token da sessão.
export async function sendWhatsApp(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "sem sessão" };

  const res = await fetch("/api/send-whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, error: "resposta inválida" };
  }
}
```

- [ ] **Step 2: Reescrever src/lib/whatsapp.js**

```js
import { sendWhatsApp } from "@/functions/sendWhatsApp";
import { fromMinutes } from "@/lib/capacity";

// Fire-and-forget: envio de WhatsApp nunca bloqueia o fluxo.
export async function notifyWhatsApp(payload) {
  try {
    return await sendWhatsApp(payload);
  } catch {
    return { ok: false };
  }
}

// Fila: "é a sua vez". Manda texto livre (se a janela estiver aberta) ou
// o template fila_chamada (fallback). A função serverless decide qual usar.
export function notifyQueueCall(entry) {
  if (!entry?.customer_phone) return Promise.resolve({ ok: false, skipped: true });
  const partySize = String(entry.party_size ?? "");
  return notifyWhatsApp({
    restaurant_id: entry.restaurant_id,
    phone: entry.customer_phone,
    type: "fila_chamada",
    related_entity_type: "waitlist",
    related_entity_id: entry.id,
    text: `Olá ${entry.customer_name}! 🎉 Sua vez chegou! Sua mesa para ${partySize} pessoa(s) está pronta. Por favor, dirija-se à recepção.`,
    template: { name: "fila_chamada", params: [entry.customer_name, partySize] },
  });
}

// Confirmação de reserva. start_min (int) → "HH:MM".
export function notifyReservationConfirmation(reservation) {
  if (!reservation?.customer_phone) return Promise.resolve({ ok: false, skipped: true });
  const [y, m, d] = (reservation.date || "").split("-");
  const dateBR = y ? `${d}/${m}/${y}` : reservation.date;
  const hhmm = fromMinutes(reservation.start_min);
  const partySize = String(reservation.party_size ?? "");
  return notifyWhatsApp({
    restaurant_id: reservation.restaurant_id,
    phone: reservation.customer_phone,
    type: "reserva_confirmacao",
    related_entity_type: "reservation",
    related_entity_id: reservation.id,
    text: `Olá ${reservation.customer_name}! Sua reserva na Pizza Bis está confirmada para ${dateBR} às ${hhmm}, para ${partySize} pessoa(s). Até logo! 🍕`,
    template: {
      name: "reserva_confirmacao",
      params: [reservation.customer_name, dateBR, hhmm, partySize],
    },
  });
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: EXIT 0 (sem erros de import; `fromMinutes` existe em `src/lib/capacity.js`).

- [ ] **Step 4: Commit**

```bash
git add src/functions/sendWhatsApp.js src/lib/whatsapp.js
git commit -m "feat: camada frontend de envio WhatsApp (queue + reserva)"
```

---

### Task 7: Frontend — gatilhos do operador e botão de opt-in público

**Files:**
- Modify: `src/components/operator/WaitlistList.jsx`
- Modify: `src/components/operator/ReservationList.jsx`
- Modify: `src/components/public/QueueStatusCard.jsx`
- Modify: `src/pages/public/ReservePage.jsx`
- Create: `src/components/public/WhatsAppOptInButton.jsx`

**Interfaces:**
- Consumes: `notifyQueueCall`, `notifyReservationConfirmation` de `@/lib/whatsapp`; `VITE_WHATSAPP_BUSINESS_NUMBER`.
- Produces: `WhatsAppOptInButton` (componente reutilizável de opt-in).

- [ ] **Step 1: WaitlistList — disparo automático no "Mesa Pronta" + botão manual separado**

Em `src/components/operator/WaitlistList.jsx`:

(a) Adicionar import no topo (junto aos outros imports):

```js
import { notifyQueueCall } from "@/lib/whatsapp";
```

(b) Substituir a função `handleCall` atual por (marca chamado + dispara envio automático; sem abrir wa.me):

```js
  const handleCall = async (entry) => {
    await ensureWaitlistCustomer(entry);
    await handleStatus(entry.id, "chamado", { called_at: new Date().toISOString() });
    notifyQueueCall(entry); // fire-and-forget
  };

  // Fallback manual: abre o WhatsApp pro operador enviar na mão.
  const handleManualWhatsApp = (entry) => {
    if (!entry.customer_phone) return;
    const phone = entry.customer_phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${entry.customer_name}! 🎉 Sua vez chegou! Sua mesa para ${entry.party_size} pessoa(s) está pronta. Por favor, dirija-se à recepção.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };
```

(c) No botão "WhatsApp" (bloco `{isCalled && entry.customer_phone && ...}`), trocar `onClick={() => handleCall(entry)}` por `onClick={() => handleManualWhatsApp(entry)}`.

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: EXIT 0.

- [ ] **Step 3: ReservationList — disparar confirmação no botão "Confirmar"**

Em `src/components/operator/ReservationList.jsx`:

(a) Adicionar import:

```js
import { notifyReservationConfirmation } from "@/lib/whatsapp";
```

(b) Trocar o `onClick` do botão Confirmar (status aguardando):

De:
```js
                  onClick={() => handleStatus(res.id, "confirmada")}
```
Para:
```js
                  onClick={async () => {
                    await handleStatus(res.id, "confirmada");
                    notifyReservationConfirmation(res); // fire-and-forget
                  }}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: EXIT 0.

- [ ] **Step 5: Criar o botão de opt-in reutilizável**

Criar `src/components/public/WhatsAppOptInButton.jsx`:

```jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const BUSINESS_NUMBER = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER;

// Botão que abre o WhatsApp do cliente já com mensagem pronta PRO número do
// negócio. Ao enviar, o cliente abre a janela de 24h (avisos viram grátis).
export default function WhatsAppOptInButton({ label = "Ativar avisos no WhatsApp" }) {
  if (!BUSINESS_NUMBER) return null;
  const text = encodeURIComponent(
    "Olá! Quero receber os avisos da minha fila/reserva por aqui. 🍕"
  );
  const href = `https://wa.me/${BUSINESS_NUMBER}?text=${text}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white">
        <MessageCircle className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </a>
  );
}
```

- [ ] **Step 6: Mostrar o opt-in na tela de status da fila**

Em `src/components/public/QueueStatusCard.jsx`:

(a) Import no topo:

```js
import WhatsAppOptInButton from "@/components/public/WhatsAppOptInButton";
```

(b) No ramo "aguardando" (o bloco `else` que mostra a posição), logo após o parágrafo
"Aguarde ser chamado...", adicionar o botão:

```jsx
        <div className="mt-4">
          <WhatsAppOptInButton label="📱 Quero ser avisado no WhatsApp" />
        </div>
```

- [ ] **Step 7: Mostrar o opt-in na tela de sucesso da reserva**

Em `src/pages/public/ReservePage.jsx`, dentro do bloco `if (done) { ... }`, logo após o
parágrafo "Sua reserva está aguardando confirmação do restaurante.", adicionar:

```jsx
          <div className="mt-5">
            <WhatsAppOptInButton label="📱 Receber avisos no WhatsApp" />
          </div>
```

E adicionar o import no topo do arquivo:

```js
import WhatsAppOptInButton from "@/components/public/WhatsAppOptInButton";
```

- [ ] **Step 8: Verificar build e commitar**

Run: `npm run build`
Expected: EXIT 0.

```bash
git add src/components/operator/WaitlistList.jsx src/components/operator/ReservationList.jsx src/components/public/QueueStatusCard.jsx src/pages/public/ReservePage.jsx src/components/public/WhatsAppOptInButton.jsx
git commit -m "feat: gatilhos de envio WhatsApp + botao de opt-in publico"
```

---

### Task 8: Verificação de ponta a ponta (pós-deploy + Meta pronta)

**Files:** nenhum (verificação manual).

**Pré-requisitos:** Task 1-7 commitadas e no ar; secrets na Vercel; templates aprovados pela Meta; número configurado; webhook apontado pro domínio Vercel.

- [ ] **Step 1: Push e aguardar deploy Vercel**

```bash
git push origin main
```
Aguardar o deploy concluir no painel Vercel.

- [ ] **Step 2: Testar o handshake do webhook**

```bash
curl -s "https://<dominio>/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345"
# Esperado: 12345
```

- [ ] **Step 3: Testar opt-in real**

Do celular, enviar uma mensagem ao número do negócio. Depois, no Supabase SQL Editor:

```sql
select * from public.whatsapp_optins order by opened_at desc limit 5;
```
Esperado: linha com o seu telefone e `opened_at` recente.

- [ ] **Step 4: Testar envio dentro da janela (grátis, texto livre)**

No app (logado como operador), criar uma entrada de fila com o seu telefone (o mesmo que
mandou a mensagem) e clicar "Mesa Pronta". Esperado: receber a mensagem no WhatsApp.

No SQL Editor:
```sql
select type, status, template, provider_message_id, error
from public.notification_log order by created_at desc limit 5;
```
Esperado: `status = enviado`, `template = null` (foi texto livre).

- [ ] **Step 5: Testar fallback de template (janela fechada)**

Usar um telefone que NÃO mandou mensagem. Criar entrada e clicar "Mesa Pronta".
Esperado: mensagem chega via template `fila_chamada`; no log `status = enviado`,
`template = fila_chamada`. (Se o template ainda não estiver aprovado, `status = falhou` —
nesse caso usar o botão manual "WhatsApp".)

- [ ] **Step 6: Testar confirmação de reserva**

Confirmar uma reserva com seu telefone. Esperado: WhatsApp recebido; log registrado.

---

## Notas de execução

- Tasks 1 e 8 envolvem ações manuais no Supabase/Meta/Vercel (não dá pra automatizar daqui).
- O envio real só funciona após os secrets e templates estarem prontos — por isso a
  verificação ponta-a-ponta é a Task 8, separada.
- Nada de service_role em nenhum ponto: webhook usa RPC com anon key; envio usa o JWT do operador.
