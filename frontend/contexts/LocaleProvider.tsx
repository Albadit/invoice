'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type Locale, languages, fallbackLng } from '@/lib/i18n/settings';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  languages: readonly Locale[];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return fallbackLng;
  
  const cookieLocale = document.cookie
    .split('; ')
    .find((row) => row.startsWith('NEXT_LOCALE='))
    ?.split('=')[1];
  
  if (cookieLocale && languages.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  
  return fallbackLng;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!languages.includes(newLocale)) return;
    
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocaleState(newLocale);
    
    // Reload to apply new language
    window.location.reload();
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, languages }}>
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
