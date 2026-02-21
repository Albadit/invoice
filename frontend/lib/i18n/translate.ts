export type Translations = Record<string, unknown>;

/**
 * Resolve a dot-separated key from a nested translations object.
 * Returns the key itself when the path is not found.
 */
export function tl(translations: Translations, key: string): string {
  const parts = key.split('.');
  let current: unknown = translations;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}
