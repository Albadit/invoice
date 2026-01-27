/**
 * Supabase REST API base configuration
 * Shared API utilities used by feature-specific API modules
 */

export const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`
  : 'http://127.0.0.1:54321/rest/v1';

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
