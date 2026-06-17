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
