import { sendWhatsApp } from "@/functions/sendWhatsApp";

// Fire-and-forget: o envio de WhatsApp nunca bloqueia o fluxo da fila/reserva.
export async function notifyWhatsApp(payload) {
  try {
    await sendWhatsApp(payload);
  } catch {
    // falha de envio é registrada no NotificationLog pelo backend; nunca propaga
  }
}

// Template utility "confirmacao_reserva" (pago, iniciado pelo restaurante)
export function notifyReservationConfirmation(reservation) {
  if (!reservation?.customer_phone) return;
  const [y, m, d] = (reservation.date || "").split("-");
  notifyWhatsApp({
    restaurant_id: reservation.restaurant_id,
    phone: reservation.customer_phone,
    type: "reserva_confirmacao",
    related_entity_type: "reservation",
    related_entity_id: reservation.id,
    template: {
      params: [
        reservation.customer_name,
        `${d}/${m}/${y}`,
        reservation.time,
        String(reservation.party_size),
      ],
    },
  });
}

// Mensagem de texto livre dentro da janela de 24h (gratuita) — só para quem deu opt-in
export function notifyQueueEvent(entry, text, type = "outro") {
  if (!entry?.whatsapp_opt_in || !entry?.customer_phone) return;
  notifyWhatsApp({
    restaurant_id: entry.restaurant_id,
    phone: entry.customer_phone,
    type,
    related_entity_type: "waitlist",
    related_entity_id: entry.id,
    text,
  });
}