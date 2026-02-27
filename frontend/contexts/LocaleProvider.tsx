'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { type Locale, type LanguageConfig, fallbackLng, getOptions, setLanguageConfig as setGlobalLanguageConfig } from '@/lib/i18n/settings';

// Track if i18next has been initialized
let i18nextInitialized = false;

function initI18next(lng: string, namespaces: string[]) {
  if (i18nextInitialized) {
    // Language sync is handled by useEffect, not during render
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
      ...getOptions(lng, namespaces),
      lng,
      fallbackLng,
      ns: namespaces,
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
  namespaces?: string[];
}

export function LocaleProvider({ children, languageConfig, initialLocale, namespaces = ['common'] }: LocaleProviderProps) {
  const languages = languageConfig.map(l => l.key);
  const startLocale = initialLocale || fallbackLng;
  
  // Initialize i18next with the server-provided locale and namespaces
  initI18next(startLocale, namespaces);
  
  // Set global language config for use outside of React context
  useEffect(() => {
    setGlobalLanguageConfig(languageConfig);
  }, [languageConfig]);
  
  const [locale, setLocaleState] = useState<Locale>(startLocale);
  const [currentNs, setCurrentNs] = useState<string | string[]>('common');
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  
  // Use i18next translation with ready state
  const { t: tOrg, i18n, ready } = useTranslationOrg(currentNs, { useSuspense: false });
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

  // Show loading screen until mounted and translations are ready.
  // Server and client first-render both show the spinner (mounted=false),
  // so there's no hydration mismatch. Once useEffect fires, mounted+ready
  // flips and children render with fully loaded translations.
  if (!mounted || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-default-200 border-t-primary" />
        </div>
      </div>
    );
  }

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
