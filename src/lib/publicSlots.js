function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Calcula os horários disponíveis de um salão para uma data específica,
// considerando grade semanal, datas especiais e bloqueios.
// Cada slot configurado (ex: 17:30–20:00) é expandido em intervalos de 30 min
// para que o cliente possa escolher entre vários horários de início.
export function getAvailableSlots(room, dateStr) {
  if (!room || !dateStr) return [];

  const blocked = (room.blocked_dates || []).filter((b) => b.date === dateStr);
  if (blocked.some((b) => b.full_day !== false)) return [];

  const special = (room.special_dates || []).find((s) => s.date === dateStr);
  let rawSlots;
  if (special) {
    rawSlots = special.time_slots || [];
  } else {
    const day = new Date(dateStr + "T12:00:00").getDay();
    const daySchedule = (room.schedule || []).find((s) => s.day_of_week === day);
    rawSlots = daySchedule?.time_slots || [];
  }

  const partialBlocks = blocked.filter(
    (b) => b.full_day === false && b.start_time && b.end_time
  );

  const INTERVAL = 30; // minutos entre cada horário de início

  // Expande cada slot bruto em múltiplos horários de início
  const expanded = [];
  for (const slot of rawSlots) {
    const startMin = toMinutes(slot.start_time);
    const endMin = toMinutes(slot.end_time);
    for (let m = startMin; m < endMin; m += INTERVAL) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      expanded.push({
        start_time: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        end_time: slot.end_time,
        capacity: slot.capacity,
      });
    }
  }

  // Filtra horários que conflitam com bloqueios parciais
  return expanded.filter((slot) => {
    const slotEnd = toMinutes(slot.start_time) + INTERVAL;
    return !partialBlocks.some(
      (b) => toMinutes(slot.start_time) < toMinutes(b.end_time) && slotEnd > toMinutes(b.start_time)
    );
  });
}