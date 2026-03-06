/**
 * Supabase REST API base configuration
 * Shared API utilities used by feature-specific API modules
 * 
 * Uses SUPABASE_INTERNAL_URL for server-side calls (inside Docker)
 * and NEXT_PUBLIC_SUPABASE_URL for client-side calls (browser).
 */

import { createClient } from '@/lib/supabase/client';

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:8000';

export const API_URL = `${baseUrl}/rest/v1`;

export const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Common headers for API requests.
 * Includes Authorization header when a user session is available (required for RLS).
 * 
 * On the client side, the token is fetched automatically from the browser session.
 * On the server side (Route Handlers), pass authToken explicitly.
 */
export async function getHeaders(prefer?: string, authToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };
  
  if (authToken) {
    // Explicit token provided (server-side callers)
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (typeof window !== 'undefined') {
    // Client-side: use browser supabase client
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Silently ignore — unauthenticated requests still work for public data
    }
  }

  if (prefer) {
    headers['Prefer'] = prefer;
  }
  
  return headers;
}

// ─── Convenience HTTP helpers ──────────────────────────────────────────
// Wraps Supabase REST API calls so feature hooks stay clean.

interface RequestOptions {
  prefer?: string;
  authToken?: string;
  signal?: AbortSignal;
}

/**
 * Core fetch wrapper – every request goes through {@link getHeaders}
 * so the API key + auth token are always attached.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const headers = await getHeaders(opts?.prefer, opts?.authToken);
  const res = await fetch(path, {
    method,
    headers,
    signal: opts?.signal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.details || res.statusText);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * Like {@link request} but returns the raw Response object.
 * Use when you need to inspect headers (e.g. Content-Range for pagination counts).
 */
async function rawFetch(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<Response> {
  const headers = await getHeaders(opts?.prefer, opts?.authToken);
  const res = await fetch(path, {
    method,
    headers,
    signal: opts?.signal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.details || res.statusText);
  }

  return res;
}

const api = {
  /** GET with auto-attached headers */
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
  /** POST with auto-attached headers */
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body, opts),
  /** PUT with auto-attached headers */
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, body, opts),
  /** PATCH with auto-attached headers */
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, body, opts),
  /** DELETE with auto-attached headers */
  delete: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("DELETE", path, body, opts),

  /**
   * Like GET but returns the raw Response (for reading headers like Content-Range).
   */
  getRaw: (path: string, opts?: RequestOptions) => rawFetch("GET", path, undefined, opts),
};

export default api;
