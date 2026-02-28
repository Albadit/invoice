/**
 * Pure invoice calculation helpers.
 *
 * Shared between the read-only invoice view (invoice-utils.tsx)
 * and the invoice editor (edit/page.tsx) so arithmetic stays DRY.
 */

import type { AmountType } from '@/lib/types';

/** Minimal line-item shape needed for calculations. */
export interface CalcItem {
  quantity: number;
  unit_price: number;
}

/** All inputs needed to compute an invoice total. */
export interface InvoiceTotals {
  items: CalcItem[];
  discountType?: AmountType | null;
  discountAmount?: number | null;
  taxType?: AmountType | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
}

/** Sum of (qty × unit_price) for every line item. */
export function getSubtotal(items: CalcItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0,
  );
}

/** Resolved discount in the invoice currency. */
export function getDiscountTotal(
  subtotal: number,
  discountType?: AmountType | null,
  discountAmount?: number | null,
): number {
  if (discountType === 'percent' && discountAmount) {
    return (subtotal * discountAmount) / 100;
  }
  return discountAmount || 0;
}

/** Resolved tax in the invoice currency (applied after discount). */
export function getTaxTotal(
  afterDiscount: number,
  taxType?: AmountType | null,
  taxAmount?: number | null,
): number {
  if (taxType === 'percent' && taxAmount) {
    return (afterDiscount * taxAmount) / 100;
  }
  return taxAmount || 0;
}

/** Grand total: subtotal − discount + tax + shipping. */
export function getInvoiceTotal(input: InvoiceTotals): number {
  const subtotal = getSubtotal(input.items);
  const discount = getDiscountTotal(subtotal, input.discountType, input.discountAmount);
  const afterDiscount = subtotal - discount;
  const tax = getTaxTotal(afterDiscount, input.taxType, input.taxAmount);
  return subtotal - discount + tax + (input.shippingAmount || 0);
}
