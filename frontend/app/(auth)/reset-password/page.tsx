'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { resetPasswordApi } from '@/features/users/api';
import { useTranslation } from '@/contexts/LocaleProvider';
import { LanguageSwitcher } from '@/components/ui';
import { AUTH_ROUTES } from '@/config/routes';

function ResetPasswordContent() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateToken = useCallback(async () => {
    setValidating(true);
    try {
      const result = await resetPasswordApi.validate(token);
      setValid(result.valid);
      setEmail(result.email || '');
    } catch {
      setValid(false);
    } finally {
      setValidating(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }
    validateToken();
  }, [token, validateToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError(t('resetPassword.fieldsRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('resetPassword.minLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('resetPassword.mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const ok = await resetPasswordApi.reset(token, password);
      if (ok) {
        setSuccess(true);
      } else {
        setError(t('resetPassword.failed'));
      }
    } catch {
      setError(t('resetPassword.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (validating) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Spinner size="lg" />
        <p className="text-default-500">{t('resetPassword.validating')}</p>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="size-16 text-success" />
        <h2 className="text-xl font-bold">{t('resetPassword.successTitle')}</h2>
        <p className="text-default-500 text-center">
          {t('resetPassword.successMessage')}
        </p>
        <Button
          color="primary"
          onClick={() => router.push(AUTH_ROUTES.login)}
          className="mt-4"
        >
          {t('resetPassword.goToLogin')}
        </Button>
      </div>
    );
  }

  // Invalid/expired token
  if (!valid || !token) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <XCircle className="size-16 text-danger" />
        <h2 className="text-xl font-bold">{t('resetPassword.invalidTitle')}</h2>
        <p className="text-default-500 text-center">
          {t('resetPassword.invalidMessage')}
        </p>
        <Button
          color="primary"
          variant="flat"
          onClick={() => router.push(AUTH_ROUTES.login)}
          className="mt-4"
        >
          {t('resetPassword.goToLogin')}
        </Button>
      </div>
    );
  }

  // Password form
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-default-500 text-center mb-2">
        {t('resetPassword.forUser')}: <strong>{email}</strong>
      </p>
      <Input
        type="password"
        label={t('resetPassword.newPassword')}
        placeholder={t('resetPassword.newPasswordPlaceholder')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        isRequired
      />
      <Input
        type="password"
        label={t('resetPassword.confirmPassword')}
        placeholder={t('resetPassword.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        isRequired
      />
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      <Button
        type="submit"
        color="primary"
        fullWidth
        isLoading={submitting}
      >
        {t('resetPassword.submit')}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-default-50 px-4">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <FileText className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('resetPassword.title')}
          </h1>
          <p className="text-sm text-default-500">
            {t('resetPassword.subtitle')}
          </p>
        </div>

        {/* Reset Card */}
        <div className="rounded-xl border border-default-200 bg-background p-8 shadow-sm">
          <Suspense fallback={<Spinner size="lg" className="mx-auto" />}>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
