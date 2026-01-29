export const fallbackLng = 'en';
export const defaultNS = 'common';

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
