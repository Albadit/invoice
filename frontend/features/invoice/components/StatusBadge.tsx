import { Chip } from "@heroui/chip";
import type { InvoiceStatus } from '@/lib/types';
import { STATUS_THEME } from '@/config/constants';

export interface StatusLabels {
  pending: string;
  paid: string;
  overdue: string;
  cancelled: string;
}

const DEFAULT_LABELS: StatusLabels = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

/**
 * Renders a color-coded status badge for an invoice status.
 */
export function StatusBadge({
  status,
  labels = DEFAULT_LABELS,
}: {
  status: InvoiceStatus;
  labels?: StatusLabels;
}) {
  const theme = STATUS_THEME[status] ?? STATUS_THEME.pending;
  const text = labels[status] ?? labels.pending;

  return (
    <Chip color={theme as 'warning' | 'success' | 'danger' | 'default'} variant="flat" size="sm">
      {text}
    </Chip>
  );
}
