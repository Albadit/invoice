import { Chip } from "@heroui/chip";
import type { InvoiceStatus, InvoiceWithItems } from '@/lib/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { invoicesApi } from '@/features/invoice/api';
import { getSubtotal, getDiscountTotal, getTaxTotal } from '@/features/invoice/utils/calculations';
import { INVOICE_ROUTES } from '@/config/routes';

/**
 * Get status badge component for invoice status
 */
export function getStatusBadge(status: InvoiceStatus, statusLabels?: { pending: string; paid: string; overdue: string; cancelled: string }) {
  const defaultLabels = {
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };
  
  const labels = statusLabels || defaultLabels;
  
  const statusConfig = {
    pending: { color: 'warning' as const, text: labels.pending },
    paid: { color: 'success' as const, text: labels.paid },
    overdue: { color: 'danger' as const, text: labels.overdue },
    cancelled: { color: 'default' as const, text: labels.cancelled },
  };

  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <Chip color={config.color} variant="flat" size="sm">
      {config.text}
    </Chip>
  );
}

/**
 * Calculate discount amount for an invoice
 */
export function getDiscountAmount(invoice: InvoiceWithItems): number {
  const subtotal = getSubtotal(invoice.items);
  return getDiscountTotal(subtotal, invoice.discount_type, invoice.discount_amount);
}

/**
 * Calculate tax amount for an invoice
 */
export function getTaxAmount(invoice: InvoiceWithItems): number {
  const subtotal = getSubtotal(invoice.items);
  const discount = getDiscountAmount(invoice);
  return getTaxTotal(subtotal - discount, invoice.tax_type, invoice.tax_amount);
}

/**
 * Mark invoice as paid
 */
export async function handleMarkAsPaid(invoiceId: string | number, onSuccess: () => void) {
  await invoicesApi.updateStatus(String(invoiceId), 'paid');
  await onSuccess();
}

/**
 * Mark invoice as pending
 */
export async function handleMarkAsPending(invoiceId: string | number, onSuccess: () => void) {
  await invoicesApi.updateStatus(String(invoiceId), 'pending');
  await onSuccess();
}

/**
 * Void an invoice
 */
export async function handleVoid(invoiceId: string | number, onSuccess: () => void) {
  await invoicesApi.updateStatus(String(invoiceId), 'cancelled');
  await onSuccess();
}

/**
 * Duplicate an invoice
 */
export async function handleDuplicate(invoiceId: string | number, router: AppRouterInstance) {
  // Fetch the invoice to duplicate
  const invoice = await invoicesApi.getById(String(invoiceId));
  
  // Create new invoice (without id, created_at, updated_at, and joined relations)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _created_at, updated_at: _updated_at, items, currency: _currency, company: _company, client: _client, invoice_code: _invoice_code, search_tsv: _search_tsv, search_text: _search_text, user_id: _user_id, ...invoiceData } = invoice;
  const newInvoiceData = {
    ...invoiceData,
    status: 'pending',
  };
  
  // Create the duplicate invoice with its items
  const newInvoice = await invoicesApi.create(
    newInvoiceData as Parameters<typeof invoicesApi.create>[0],
    items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  );
  
  router.push(INVOICE_ROUTES.edit(newInvoice.id));
}
