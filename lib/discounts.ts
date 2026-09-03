export type DiscountType = "percentage" | "fixed_amount";

import { calculateVat, DEFAULT_VAT_RATE, parseVatRate } from "@/lib/commercialTax";

export function calculateDiscount(listSubtotal: number, type: DiscountType, requestedValue: number, vatRate = DEFAULT_VAT_RATE) {
  const safeListSubtotal = Math.max(0, Number(listSubtotal) || 0);
  const safeValue = Math.max(0, Number(requestedValue) || 0);
  if (!safeListSubtotal) throw new Error("The quote has no discountable value.");
  if (type !== "percentage" && type !== "fixed_amount") throw new Error("Discount type must be percentage or fixed amount.");
  if (safeValue <= 0) throw new Error("Discount value must be greater than zero.");
  if (type === "percentage" && safeValue > 100) throw new Error("Percentage discounts cannot exceed 100%.");

  const rawAmount = type === "percentage" ? safeListSubtotal * (safeValue / 100) : safeValue;
  const discountAmount = Math.round(Math.min(rawAmount, safeListSubtotal) * 100) / 100;
  const requestedPercent = Math.round((discountAmount / safeListSubtotal) * 10000) / 100;
  const revisedSubtotal = Math.round((safeListSubtotal - discountAmount) * 100) / 100;
  const revisedVat = calculateVat(revisedSubtotal, parseVatRate(vatRate));
  const revisedTotal = Math.round((revisedSubtotal + revisedVat) * 100) / 100;

  return { listSubtotal: safeListSubtotal, discountAmount, requestedPercent, revisedSubtotal, revisedVat, revisedTotal };
}

export const formatZar = (value: number) => `R ${Number(value || 0).toFixed(2)}`;
