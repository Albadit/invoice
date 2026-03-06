/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CENTRALIZED ROUTE DEFINITIONS                                  ║
 * ║  All URL paths in the app are defined here.                     ║
 * ║  Update this file when adding, renaming or removing routes.     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Structure mirrors the app/ folder route groups:
 *   (auth)      → routes that don't require login (login page, etc.)
 *   (protected) → routes that require authentication
 *   (public)    → routes open to everyone
 *   auth/       → API routes for auth (callback, etc.)
 */

// ─── (auth) group ────────────────────────────────────────────────
export const AUTH_ROUTES = {
  login: '/login',
  resetPassword: '/reset-password',
} as const;

// ─── auth API (non-group, always accessible) ─────────────────────
export const AUTH_API_ROUTES = {
  callback: '/callback',
} as const;

// ─── (protected) group ──────────────────────────────────────────
// Each key matches the folder name inside app/(protected)/
export const PROTECTED_ROUTES = {
  dashboard: '/dashboard',
  invoice: '/invoice',
  editor: '/editor',
  settings: '/settings',
  profile: '/profile',
  users: '/users',
  roles: '/roles',
} as const;

// ─── Dynamic protected routes (parameterized) ───────────────────
export const INVOICE_ROUTES = {
  list: PROTECTED_ROUTES.invoice,
  new: `${PROTECTED_ROUTES.invoice}/new/edit`,
  edit: (id: string) => `${PROTECTED_ROUTES.invoice}/${id}/edit`,
  download: (id: string) => `${PROTECTED_ROUTES.invoice}/${id}/download`,
} as const;

export const EDITOR_ROUTES = {
  page: PROTECTED_ROUTES.editor,
  render: `${PROTECTED_ROUTES.editor}/render`,
} as const;

export const SETTINGS_ROUTES = {
  page: PROTECTED_ROUTES.settings,
  templates: `${PROTECTED_ROUTES.settings}?tab=templates`,
  currencies: `${PROTECTED_ROUTES.settings}?tab=currencies`,
} as const;

export const USERS_ROUTES = {
  page: PROTECTED_ROUTES.users,
} as const;

export const ROLES_ROUTES = {
  page: PROTECTED_ROUTES.roles,
} as const;

export const PROFILE_ROUTES = {
  page: PROTECTED_ROUTES.profile,
} as const;

// ─── Special ────────────────────────────────────────────────────
export const ROUTES = {
  home: '/',
  logout: '/login', // after sign-out, redirect here
  afterLogin: PROTECTED_ROUTES.dashboard,
} as const;

// ─── Helpers for middleware ──────────────────────────────────────

/** Prefixes that identify auth-group routes (no login required, but redirects away if logged in) */
export const AUTH_ROUTE_PREFIXES: readonly string[] = [
  AUTH_ROUTES.login,
  AUTH_API_ROUTES.callback,
];

/** Prefixes that identify protected-group routes (login required) – derived from folder names */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = Object.values(PROTECTED_ROUTES);
