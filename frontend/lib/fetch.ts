/**
 * Type-safe Fetch API wrapper for Supabase
 * 
 * Provides a clean interface for HTTP operations with built-in
 * error handling, TypeScript support, and Supabase integration.
 */

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface FetchResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  status: number;
}

/**
 * Base fetch wrapper with error handling
 */
async function baseFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResponse<T>> {
  try {
    const { params, ...fetchOptions } = options;

    // Add query parameters if provided
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      );
      finalUrl = `${url}?${searchParams.toString()}`;
    }

    const response = await globalThis.fetch(finalUrl, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    const data = response.ok ? await response.json() : null;
    const error = !response.ok
      ? {
          message: `HTTP ${response.status}: ${response.statusText}`,
          details: data?.message || data?.error,
        }
      : null;

    return {
      data,
      error,
      status: response.status,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      status: 0,
    };
  }
}

/**
 * Fetch wrapper with HTTP methods
 */
export const fetch = {
  /**
   * GET request
   */
  async get<T = any>(url: string, options?: FetchOptions): Promise<FetchResponse<T>> {
    return baseFetch<T>(url, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: FetchOptions
  ): Promise<FetchResponse<T>> {
    return baseFetch<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: FetchOptions
  ): Promise<FetchResponse<T>> {
    return baseFetch<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: FetchOptions
  ): Promise<FetchResponse<T>> {
    return baseFetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: FetchOptions): Promise<FetchResponse<T>> {
    return baseFetch<T>(url, {
      ...options,
      method: 'DELETE',
    });
  },

  /**
   * HEAD request
   */
  async head(url: string, options?: FetchOptions): Promise<FetchResponse<void>> {
    return baseFetch<void>(url, {
      ...options,
      method: 'HEAD',
    });
  },

  /**
   * OPTIONS request
   */
  async options<T = any>(url: string, options?: FetchOptions): Promise<FetchResponse<T>> {
    return baseFetch<T>(url, {
      ...options,
      method: 'OPTIONS',
    });
  },
};

/**
 * Export types for use in other files
 */
export type { FetchOptions, FetchResponse, SupabaseError };
