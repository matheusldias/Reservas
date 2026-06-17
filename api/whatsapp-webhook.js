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
