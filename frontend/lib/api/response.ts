/**
 * Standardized API response helpers.
 * Every API route returns a consistent envelope.
 */

import { NextResponse } from 'next/server';

// ── Response envelope ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function success<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: ApiSuccess<T> = { ok: true, data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function error(message: string, status = 400, code?: string) {
  const body: ApiError = { ok: false, error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}
