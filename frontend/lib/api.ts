/**
 * Supabase REST API base configuration
 * Shared API utilities used by feature-specific API modules
 * 
 * Uses SUPABASE_INTERNAL_URL for server-side calls (inside Docker)
 * and NEXT_PUBLIC_SUPABASE_URL for client-side calls (browser).
 */

import { createClient } from '@/lib/supabase/client';

const baseUrl = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:8000')
  : (process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:8000');

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
