// Datas do banco (created_date/updated_date) vêm SEM indicador de timezone, mas são UTC.
// Esta função normaliza: acrescenta "Z" quando a string não tem timezone.
export function parseDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  let str = String(value);
  if (!/([zZ]|[+-]\d{2}:?\d{2})$/.test(str)) str += "Z";
  return new Date(str);
}

// Minutos entre uma data do banco e agora — nunca negativo.
export function minutesSince(iso) {
  const start = parseDbDate(iso);
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 60000));
}

// Ordenação dinâmica da fila: prioridade primeiro, depois ordem de chegada.
export function sortQueue(entries) {
  return [...entries].sort((a, b) => {
    if (!!a.priority !== !!b.priority) return a.priority ? -1 : 1;
    return parseDbDate(a.created_date) - parseDbDate(b.created_date);
  });
}