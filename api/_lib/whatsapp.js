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
