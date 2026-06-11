// Normaliza telefone brasileiro: somente dígitos com DDI 55.
// Ex: "(47) 99760-9754" -> "5547997609754". Não duplica o 55 se já vier com DDI.
export function normalizePhone(input) {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
}

// Máscara visual (XX) XXXXX-XXXX para exibição em formulários.
export function formatPhoneMask(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}