export const DEFAULT_VAT_RATE = 15;

export function parseVatRate(value: unknown, fallback = DEFAULT_VAT_RATE) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fallback;
  return Math.round(parsed * 100) / 100;
}

export function calculateVat(subtotal: number, vatRate: number) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safeRate = parseVatRate(vatRate);
  return Math.round(safeSubtotal * (safeRate / 100) * 100) / 100;
}

export function calculateTotal(subtotal: number, vatRate: number) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  return Math.round((safeSubtotal + calculateVat(safeSubtotal, vatRate)) * 100) / 100;
}

export function deriveVatRate(subtotal: number, vat: number, fallback = DEFAULT_VAT_RATE) {
  const safeSubtotal = Number(subtotal) || 0;
  const safeVat = Number(vat) || 0;
  if (safeSubtotal <= 0 || safeVat < 0) return fallback;
  return parseVatRate((safeVat / safeSubtotal) * 100, fallback);
}

export function formatVatLabel(vatRate: number) {
  const rate = parseVatRate(vatRate);
  const display = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `VAT (${display}%)`;
}
