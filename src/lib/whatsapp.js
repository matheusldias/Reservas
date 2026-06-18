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
    type: "fila_chamado",
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