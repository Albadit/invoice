'use client';

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { Globe } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleProvider';
import { useTranslation } from '@/lib/i18n/client';

const languageNames: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
  al: 'Shqip',
  mk: 'Македонски',
};

export function LanguageSwitcher() {
  const { locale, setLocale, languages } = useLocale();
  const { t } = useTranslation(locale, 'common');

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="flat" isIconOnly aria-label={t('common.language')}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Language selection"
        selectedKeys={new Set([locale])}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          if (selected) setLocale(selected as typeof locale);
        }}
      >
        {languages.map((lang) => (
          <DropdownItem key={lang}>
            {languageNames[lang] || lang}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
