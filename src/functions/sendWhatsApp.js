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
