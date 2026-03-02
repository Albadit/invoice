'use client';

import { LoginForm } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import { LanguageSwitcher } from '@/components/ui';
import { FileText } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-default-50 px-4">
      {/* Language Switcher - top right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <FileText className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('login.title')}</h1>
          <p className="text-sm text-default-500">{t('login.subtitle')}</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-default-200 bg-background p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
