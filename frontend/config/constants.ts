/**
 * Centralized application constants.
 *
 * Shared immutable values used across the codebase.
 * Import from '@/config/constants' instead of scattering magic numbers.
 */

// ─── Pagination ─────────────────────────────────────────────────

/** Default number of rows displayed per page in tables. */
export const DEFAULT_ROWS_PER_PAGE = 10;

/** Default page-size for API list endpoints (e.g. clients, cursor pagination). */
export const DEFAULT_API_PAGE_SIZE = 50;

// ─── File Uploads ───────────────────────────────────────────────

/** Maximum logo file size in bytes (5 MB). */
export const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

/** Accepted image MIME type prefix for logo uploads. */
export const LOGO_ACCEPTED_TYPE_PREFIX = 'image/';

/** Supabase storage bucket name for company logos. */
export const LOGO_STORAGE_BUCKET = 'logos';

// ─── Invoice Status → HeroUI Theme Color ────────────────────────

/**
 * Maps each invoice status to its HeroUI theme color token.
 * Used consistently across badges, KPI cards, and charts.
 */
export const STATUS_THEME: Record<string, string> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'default',
} as const;

// ─── Misc ───────────────────────────────────────────────────────

/** Application display name. */
export const APP_NAME = 'Invoice';
