import { Chip } from "@heroui/chip";
import type { InvoiceStatus, InvoiceWithItems } from '@/lib/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Get status badge component for invoice status
 */
export function getStatusBadge(status: InvoiceStatus) {
  const statusConfig = {
    pending: { color: 'warning' as const, text: 'Pending' },
    paid: { color: 'success' as const, text: 'Paid' },
    overdue: { color: 'danger' as const, text: 'Overdue' },
    cancelled: { color: 'default' as const, text: 'Cancelled' },
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
    const response = await fetch(`http://127.0.0.1:54321/rest/v1/invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'paid' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update invoice status');
    }
    
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
    const response = await fetch(`http://127.0.0.1:54321/rest/v1/invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'pending' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update invoice status');
    }
    
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
    const response = await fetch(`http://127.0.0.1:54321/rest/v1/invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to void invoice');
    }
    
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
    const response = await fetch(
      `http://127.0.0.1:54321/rest/v1/invoices?id=eq.${invoiceId}&select=*,invoice_items(*)`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch invoice');
    }
    
    const invoices = await response.json();
    const invoice = invoices[0];
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Create new invoice (without id, created_at, updated_at)
    const { id, created_at, updated_at, invoice_items, invoice_number, ...invoiceData } = invoice;
    const newInvoiceData = {
      ...invoiceData,
      status: 'pending',
      // invoice_number: `${invoice_number}-COPY-${Date.now()}`
    };
    
    const createResponse = await fetch('http://127.0.0.1:54321/rest/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newInvoiceData)
    });
    
    if (!createResponse.ok) {
      throw new Error('Failed to create duplicate invoice');
    }
    
    const [newInvoice] = await createResponse.json();
    
    // Create invoice items for the new invoice
    if (invoice_items && invoice_items.length > 0) {
      const newItems = invoice_items.map((item: any) => {
        const { id, invoice_id, created_at, updated_at, ...itemData } = item;
        return {
          ...itemData,
          invoice_id: newInvoice.id
        };
      });
      
      await fetch('http://127.0.0.1:54321/rest/v1/invoice_items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(newItems)
      });
    }
    
    router.push(`/invoice/${newInvoice.id}/edit`);
  } catch (error) {
    console.error('Failed to duplicate invoice:', error);
    alert('Failed to duplicate invoice. Please try again.');
  }
}
