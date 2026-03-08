'use client';

import { useState, useCallback, useRef } from 'react';
import { CalendarDate } from '@internationalized/date';

/** Custom JSON replacer that handles Set and CalendarDate */
function replacer(_key: string, value: unknown) {
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value) };
  }
  if (
    value != null &&
    typeof value === 'object' &&
    'calendar' in value &&
    'year' in value &&
    'month' in value &&
    'day' in value
  ) {
    const d = value as { year: number; month: number; day: number };
    return { __type: 'CalendarDate', year: d.year, month: d.month, day: d.day };
  }
  return value;
}

/** Custom JSON reviver that restores Set and CalendarDate */
function reviver(_key: string, value: unknown) {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.__type === 'Set') return new Set(obj.values as unknown[]);
    if (obj.__type === 'CalendarDate') {
      return new CalendarDate(
        obj.year as number,
        obj.month as number,
        obj.day as number
      );
    }
  }
  return value;
}

/**
 * Drop-in replacement for useState that persists to sessionStorage.
 * Restores the cached value on mount and saves on every state change.
 *
 * @param key - Unique storage key (prefixed with 'ps:' internally)
 * @param initialValue - Default value or lazy initializer (used when no cache exists)
 * @param options.skipRestore - If true, ignore session cache and use initialValue
 * @returns [state, setState, hadCache] - hadCache is true if initial value came from session
 */
export function useSessionState<T>(
  key: string,
  initialValue: T | (() => T),
  options?: { skipRestore?: boolean }
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const storageKey = `ps:${key}`;
  const hadCacheRef = useRef(false);

  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === 'undefined' || options?.skipRestore) {
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;
    }
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored !== null) {
        hadCacheRef.current = true;
        return JSON.parse(stored, reviver) as T;
      }
    } catch {
      /* corrupted data — fall through to default */
    }
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
  });

  const setState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (value) => {
      setStateInternal((prev) => {
        const next =
          typeof value === 'function'
            ? (value as (prev: T) => T)(prev)
            : value;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next, replacer));
        } catch {
          /* quota exceeded — silently fail */
        }
        return next;
      });
    },
    [storageKey]
  );

  return [state, setState, hadCacheRef.current];
}
