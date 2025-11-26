/**
 * Supabase Client Configuration
 * 
 * This file exports a type-safe Supabase client factory
 * that can be used throughout your Next.js application.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/database.types';

/**
 * Create a Supabase client with TypeScript type safety
 * 
 * Usage:
 * ```typescript
 * import { createClient } from '@/lib/db/supabase';
 * 
 * const supabase = createClient();
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*')
 *   .eq('role', 'admin');
 * ```
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env file.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'invoice-app',
      },
    },
  });
}

/**
 * Helper function to create a Supabase client with a custom access token
 * Useful for server-side operations with user context
 */
export function createServerClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.');
  }
  
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-application-name': 'invoice-app-server',
      },
    },
  });
}
