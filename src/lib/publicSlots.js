// Calcula os horários disponíveis de um salão para uma data específica,
// considerando grade semanal, datas especiais e bloqueios.
export function getAvailableSlots(room, dateStr) {
  if (!room || !dateStr) return [];

  const blocked = (room.blocked_dates || []).filter((b) => b.date === dateStr);
  if (blocked.some((b) => b.full_day !== false)) return [];

  const special = (room.special_dates || []).find((s) => s.date === dateStr);
  let slots;
  if (special) {
    slots = special.time_slots || [];
  } else {
    const day = new Date(dateStr + "T12:00:00").getDay();
    const daySchedule = (room.schedule || []).find((s) => s.day_of_week === day);
    slots = daySchedule?.time_slots || [];
  }

  const partialBlocks = blocked.filter(
    (b) => b.full_day === false && b.start_time && b.end_time
  );

  return slots.filter(
    (slot) =>
      !partialBlocks.some(
        (b) => slot.start_time < b.end_time && slot.end_time > b.start_time
      )
  );
}