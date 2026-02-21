import fs from 'fs';
import path from 'path';
import type { Translations } from './translate';

/**
 * Load translations JSON for a given locale.
 * Server-only — uses fs to read from disk with English fallback.
 */
export function loadTranslations(lang: string): Translations {
  const filePath = path.join(process.cwd(), 'locales', lang, 'invoice.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    const fallback = path.join(process.cwd(), 'locales', 'en', 'invoice.json');
    try {
      return JSON.parse(fs.readFileSync(fallback, 'utf-8'));
    } catch {
      return {};
    }
  }
}
