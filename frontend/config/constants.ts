/**
 * Application-wide constants
 *
 * Date display formats — uses date-fns format tokens.
 * @see https://date-fns.org/docs/format
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
export const dateFormats = {
  /** Tables and general UI */
  table: 'MMM dd, yyyy',
  /** Invoice preview modal */
  preview: 'MMM dd, yyyy',
  /** Downloaded invoice PDF */
  pdf: 'dd-MM-yyyy',
};
