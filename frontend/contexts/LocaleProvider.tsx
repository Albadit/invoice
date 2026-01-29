'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { type Locale, type LanguageConfig, fallbackLng, getOptions, setLanguageConfig as setGlobalLanguageConfig } from '@/lib/i18n/settings';

// Track if i18next has been initialized
let i18nextInitialized = false;

function initI18next(lng: string) {
  if (i18nextInitialized) {
    // Already initialized, just change language if needed
    if (i18next.language !== lng) {
      i18next.changeLanguage(lng);
    }
    return;
  }
  
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
      lng,
      fallbackLng,
      interpolation: {
        escapeValue: false,
      },
    });
  
  i18nextInitialized = true;
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  languages: string[];
  languageConfig: LanguageConfig[];
  t: (key: string, options?: Record<string, unknown>) => string;
  changeNamespace: (ns: string | string[]) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  languageConfig: LanguageConfig[];
  initialLocale?: string;
}

export function LocaleProvider({ children, languageConfig, initialLocale }: LocaleProviderProps) {
  const languages = languageConfig.map(l => l.key);
  const startLocale = initialLocale || fallbackLng;
  
  // Initialize i18next with the server-provided locale
  initI18next(startLocale);
  
  // Set global language config for use outside of React context
  useEffect(() => {
    setGlobalLanguageConfig(languageConfig);
  }, [languageConfig]);
  
  const [locale, setLocaleState] = useState<Locale>(startLocale);
  const [currentNs, setCurrentNs] = useState<string | string[]>('common');
  
  // Use i18next translation
  const { t: tOrg, i18n } = useTranslationOrg(currentNs);
  const activeLngRef = useRef<Locale>(i18n.resolvedLanguage as Locale);

  // Sync i18next language with locale
  useEffect(() => {
    if (activeLngRef.current !== locale) {
      i18n.changeLanguage(locale);
      activeLngRef.current = locale;
    }
  }, [locale, i18n]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!languages.includes(newLocale)) return;
    
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocaleState(newLocale);
    
    // Reload to apply new language
    window.location.reload();
  }, [languages]);

  const changeNamespace = useCallback((ns: string | string[]) => {
    setCurrentNs(ns);
  }, []);

  // Wrapper for t function that ensures string return
  const t = useCallback((key: string, options?: Record<string, unknown>): string => {
    return String(tOrg(key, options as never));
  }, [tOrg]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, languages, languageConfig, t, changeNamespace }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// Hook for using translation with specific namespace(s)
export function useTranslation(ns?: string | string[]) {
  const context = useLocale();
  const { i18n, t: tOrg, ready } = useTranslationOrg(ns || 'common', { useSuspense: false });
  const activeLngRef = useRef<Locale>(i18n.resolvedLanguage as Locale);

  useEffect(() => {
    if (activeLngRef.current !== context.locale) {
      i18n.changeLanguage(context.locale);
      activeLngRef.current = context.locale;
    }
  }, [context.locale, i18n]);

  const t = useCallback((key: string, options?: Record<string, unknown>): string => {
    if (!ready) return key; // Return key while loading
    return String(tOrg(key, options as never));
  }, [tOrg, ready]);

  return { t, locale: context.locale, ready };
}
