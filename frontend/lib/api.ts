/**
 * Supabase REST API base configuration
 * Shared API utilities used by feature-specific API modules
 * 
 * Uses SUPABASE_INTERNAL_URL for server-side calls (inside Docker)
 * and NEXT_PUBLIC_SUPABASE_URL for client-side calls (browser).
 */

const baseUrl = typeof window === 'undefined'
  ? (process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:8000')
  : (process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:8000');

export const API_URL = `${baseUrl}/rest/v1`;

export const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Common headers for API requests
 */
export function getHeaders(prefer?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };
  
  if (prefer) {
    headers['Prefer'] = prefer;
  }
  
  return headers;
}
