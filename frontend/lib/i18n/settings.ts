export const fallbackLng = 'en';
export const languages = ['en', 'nl', 'al', 'mk'] as const;
export type Locale = (typeof languages)[number];

export const defaultNS = 'common';

export function getOptions(lng: Locale = fallbackLng, ns: string | string[] = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}
