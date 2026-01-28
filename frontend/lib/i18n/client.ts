'use client';

import { useEffect, useRef } from 'react';
import i18next from 'i18next';
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
  type UseTranslationOptions,
  type UseTranslationResponse,
} from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getOptions, languages, type Locale } from './settings';

const runsOnServerSide = typeof window === 'undefined';

// Initialize i18next for client-side
i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`@/locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(),
    lng: undefined, // let detect the language on client side
    detection: {
      order: ['cookie', 'navigator'],
      caches: ['cookie'],
    },
    preload: runsOnServerSide ? languages : [],
  });

export function useTranslation(
  lng: Locale,
  ns?: string | string[],
  options?: UseTranslationOptions<undefined>
): UseTranslationResponse<string, undefined> {
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;
  
  const activeLngRef = useRef<Locale>(i18n.resolvedLanguage as Locale);

  useEffect(() => {
    if (activeLngRef.current !== lng) {
      i18n.changeLanguage(lng);
      activeLngRef.current = lng;
    }
  }, [lng, i18n]);

  return ret;
}

export { i18next };
