/**
 * Global site configuration
 *
 * Change date display formats here to affect rendering across the app.
 * Uses date-fns format tokens: https://date-fns.org/docs/format
 *
 * Common patterns:
 *   'MMM dd, yyyy'   → Feb 27, 2026
 *   'dd MMM yyyy'    → 27 Feb 2026
 *   'dd/MM/yyyy'     → 27/02/2026
 *   'MM/dd/yyyy'     → 02/27/2026
 *   'yyyy-MM-dd'     → 2026-02-27
 *   'dd.MM.yyyy'     → 27.02.2026
 *   'MMMM dd, yyyy'  → February 27, 2026
 */
export const siteConfig = {
  /** date-fns format used in tables and general UI */
  dateFormat: 'MMM dd, yyyy',
  /** date-fns format used in the invoice preview modal */
  previewDateFormat: 'MMM dd, yyyy',
  /** date-fns format used in the downloaded invoice PDF */
  invoiceDateFormat: 'dd-MM-yyyy',
};
