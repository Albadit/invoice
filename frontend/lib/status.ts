import type { InvoiceStatus } from '@/lib/types';

/** Canonical colour palette for invoice statuses (used in charts, badges, etc.) */
export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending: 'hsl(var(--heroui-warning-400))',
  paid: 'hsl(var(--heroui-success-400))',
  overdue: 'hsl(var(--heroui-danger-400))',
  cancelled: 'hsl(var(--heroui-default-400))',
};

/**
 * Get the effective display status for an invoice.
 * If the stored status is 'pending' and the due_date is in the past, returns 'overdue'.
 */
export function getEffectiveStatus(
  status: InvoiceStatus,
  dueDate?: string | null
): InvoiceStatus {
  if (status === 'pending' && dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return status;
}
