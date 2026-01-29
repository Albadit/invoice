'use client';

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Avatar, Skeleton } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useLocale, useTranslation } from '@/contexts/LocaleProvider';

export function LanguageSwitcher() {
  const { setLocale, languageConfig } = useLocale();
  const { t, locale } = useTranslation('common');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current language config
  const currentLang = languageConfig.find(l => l.key === locale);

  // Show skeleton while hydrating to avoid mismatch
  if (!mounted) {
    return (
      <Button variant="flat" isIconOnly aria-label="Language">
        <Skeleton className="size-6 rounded-full" />
      </Button>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="flat" isIconOnly aria-label={t('common.language')}>
          <Avatar 
            alt={currentLang?.name || 'Language'} 
            className="size-6" 
            src={currentLang?.flag} 
          />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Language selection"
        selectedKeys={new Set([locale])}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          if (selected) setLocale(selected);
        }}
      >
        {languageConfig.map((lang) => (
          <DropdownItem 
            key={lang.key} 
            startContent={
              <Avatar 
                alt={lang.name} 
                className="size-6" 
                src={lang.flag} 
              />
            }
          >
            {lang.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
