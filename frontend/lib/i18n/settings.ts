export const fallbackLng = 'en';
export const defaultNS = 'common';

/**
 * Map app locale keys to BCP 47 / Intl locale tags.
 * Used by Intl.DateTimeFormat, Intl.NumberFormat, etc.
 */
export const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  al: 'sq-AL',
  mk: 'mk-MK',
  nl: 'nl-NL',
};

/** Resolve an app locale key to its BCP 47 locale tag. */
export function getIntlLocale(locale: string): string {
  return LOCALE_MAP[locale] ?? locale;
}

export interface LanguageConfig {
  key: string;
  name: string;
  flag: string;
}

// These will be populated from server and passed via context
export let languageConfig: LanguageConfig[] = [];
export let languages: string[] = [];

export function setLanguageConfig(config: LanguageConfig[]) {
  languageConfig = config;
  languages = config.map(l => l.key);
}

export type Locale = string;

export function getOptions(lng: Locale = fallbackLng, ns: string | string[] = defaultNS) {
  return {
    // Don't restrict supportedLngs - let any language folder work
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
