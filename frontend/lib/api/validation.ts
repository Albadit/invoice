/**
 * Request validation utilities.
 */

/**
 * Parses and validates a JSON body from a Request.
 * Returns [data, null] on success, or [null, errorMessage] on failure.
 */
export async function parseJsonBody<T>(request: Request): Promise<[T, null] | [null, string]> {
  try {
    const body = await request.json() as T;
    return [body, null];
  } catch {
    return [null, 'Invalid JSON body'];
  }
}

/**
 * Clamps a numeric value to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
