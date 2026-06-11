// Ordenação dinâmica da fila: prioridade primeiro, depois ordem de chegada.
export function sortQueue(entries) {
  return [...entries].sort((a, b) => {
    if (!!a.priority !== !!b.priority) return a.priority ? -1 : 1;
    return new Date(a.created_date) - new Date(b.created_date);
  });
}

export function minutesSince(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
}