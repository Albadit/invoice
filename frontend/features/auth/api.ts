/**
 * Auth feature API functions
 * Handles login, logout, session management, and "remember me" functionality
 */

import { createClient } from '@/lib/supabase/client';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthError {
  message: string;
  status?: number;
}

export const authApi = {
  /**
   * Sign in with email and password
   * When rememberMe is true, the session persists across browser restarts.
   * When false, the session is cleared when the browser is closed.
   */
  async login({ email, password, rememberMe = false }: LoginCredentials) {
    const supabase = createClient();

    // Store remember-me preference before signing in
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
      // Use sessionStorage flag so we can clear on tab/browser close
      sessionStorage.setItem('sessionOnly', 'true');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw { message: error.message, status: error.status } as AuthError;
    }

    return data;
  },

  /**
   * Sign out the current user
   */
  async logout() {
    const supabase = createClient();
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('sessionOnly');
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw { message: error.message } as AuthError;
    }
  },

  /**
   * Get the current session
   */
  async getSession() {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw { message: error.message } as AuthError;
    }
    return session;
  },

  /**
   * Get the current user
   */
  async getUser() {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw { message: error.message } as AuthError;
    }
    return user;
  },

  /**
   * Check if the user chose "remember me"
   */
  isRemembered(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rememberMe') === 'true';
  },

  /**
   * Handle session-only mode on page load.
   * If user did NOT check "remember me" and the sessionStorage flag is missing
   * (meaning the browser was closed and reopened), sign them out.
   */
  async handleSessionPersistence() {
    if (typeof window === 'undefined') return;

    const remembered = localStorage.getItem('rememberMe') === 'true';
    const sessionFlag = sessionStorage.getItem('sessionOnly');

    // If not remembered AND no session flag → browser was restarted → sign out
    if (!remembered && !sessionFlag) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
        window.location.href = '/auth/login';
      }
    }
  },
};
