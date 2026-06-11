import { getAvailableSlots } from "./publicSlots";

export function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const INACTIVE_STATUSES = ["cancelada", "no_show", "concluida"];

// Verifica a capacidade de um salão para uma nova reserva,
// considerando reservas sobrepostas (por duração) no mesmo salão/data.
export function checkCapacity({
  room,
  reservations,
  date,
  time,
  durationMinutes,
  partySize,
  excludeId,
}) {
  if (!room || !date || !time) return null;

  const slots = getAvailableSlots(room, date);
  const start = toMinutes(time);
  const end = start + (durationMinutes || 90);

  const slot = slots.find(
    (s) => toMinutes(s.start_time) <= start && start < toMinutes(s.end_time)
  );
  const capacity = slot?.capacity ?? room.total_capacity ?? 0;

  const overlapping = reservations.filter((r) => {
    if (r.id === excludeId) return false;
    if (r.dining_room_id !== room.id) return false;
    if (r.date !== date) return false;
    if (INACTIVE_STATUSES.includes(r.status)) return false;
    if (!r.time) return false;
    const rs = toMinutes(r.time);
    const re = rs + (r.duration_minutes || 90);
    return start < re && rs < end;
  });

  const occupied = overlapping.reduce((sum, r) => sum + (r.party_size || 0), 0);
  const remaining = Math.max(capacity - occupied, 0);

  return {
    ok: (partySize || 0) <= remaining,
    capacity,
    occupied,
    remaining,
  };
}