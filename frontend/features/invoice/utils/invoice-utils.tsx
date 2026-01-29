import { Chip } from "@heroui/chip";
import type { InvoiceStatus, InvoiceWithItems } from '@/lib/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { invoicesApi } from '@/features/invoice/api';

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
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  
  if (invoice.discount_type === 'percent' && invoice.discount_amount) {
    return (subtotal * invoice.discount_amount) / 100;
  }
  return invoice.discount_amount || 0;
}

/**
 * Calculate tax amount for an invoice
 */
export function getTaxAmount(invoice: InvoiceWithItems): number {
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const discount = getDiscountAmount(invoice);
  const afterDiscount = subtotal - discount;
  
  if (invoice.tax_type === 'percent' && invoice.tax_amount) {
    return (afterDiscount * invoice.tax_amount) / 100;
  }
  return invoice.tax_amount || 0;
}

/**
 * Mark invoice as paid
 */
export async function handleMarkAsPaid(invoiceId: string | number, onSuccess: () => void) {
  if (!confirm('Mark this invoice as paid?')) {
    return;
  }
  
  try {
    await invoicesApi.updateStatus(String(invoiceId), 'paid');
    await onSuccess();
  } catch (error) {
    console.error('Failed to mark as paid:', error);
    alert('Failed to update invoice. Please try again.');
  }
}

/**
 * Mark invoice as pending
 */
export async function handleMarkAsPending(invoiceId: string | number, onSuccess: () => void) {
  if (!confirm('Mark this invoice as pending?')) {
    return;
  }
  
  try {
    await invoicesApi.updateStatus(String(invoiceId), 'pending');
    await onSuccess();
  } catch (error) {
    console.error('Failed to mark as pending:', error);
    alert('Failed to update invoice. Please try again.');
  }
}

/**
 * Void an invoice
 */
export async function handleVoid(invoiceId: string | number, onSuccess: () => void) {
  if (!confirm('Are you sure you want to void this invoice? This action cannot be undone.')) {
    return;
  }
  
  try {
    await invoicesApi.updateStatus(String(invoiceId), 'cancelled');
    await onSuccess();
  } catch (error) {
    console.error('Failed to void invoice:', error);
    alert('Failed to void invoice. Please try again.');
  }
}

/**
 * Duplicate an invoice
 */
export async function handleDuplicate(invoiceId: string | number, router: AppRouterInstance) {
  if (!confirm('Create a duplicate of this invoice?')) {
    return;
  }
  
  try {
    // Fetch the invoice to duplicate
    const invoice = await invoicesApi.getById(String(invoiceId));
    
    // Create new invoice (without id, created_at, updated_at)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created_at: _created_at, updated_at: _updated_at, items, currency: _currency, company: _company, invoice_number: _invoice_number, ...invoiceData } = invoice;
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
    
    router.push(`/invoice/${newInvoice.id}/edit`);
  } catch (error) {
    console.error('Failed to duplicate invoice:', error);
    alert('Failed to duplicate invoice. Please try again.');
  }
}
