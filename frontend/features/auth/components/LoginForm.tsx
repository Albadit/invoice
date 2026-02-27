'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Checkbox } from '@heroui/checkbox';
import { addToast } from '@heroui/toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { useTranslation } from '@/contexts/LocaleProvider';

export function LoginForm() {
  const router = useRouter();
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      addToast({
        description: t('errors.fieldsRequired'),
        color: 'warning',
      });
      return;
    }

    setLoading(true);

    try {
      await authApi.login({ email, password, rememberMe });
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const error = err as { message?: string };
      addToast({
        description: error.message || t('errors.loginFailed'),
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label={t('login.email')}
        placeholder={t('login.emailPlaceholder')}
        labelPlacement="outside"
        type="email"
        value={email}
        onValueChange={setEmail}
        isRequired
        startContent={
          <Mail className="text-default-400 shrink-0" size={18} />
        }
      />

      <Input
        label={t('login.password')}
        placeholder={t('login.passwordPlaceholder')}
        labelPlacement="outside"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onValueChange={setPassword}
        isRequired
        startContent={
          <Lock className="text-default-400 shrink-0" size={18} />
        }
        endContent={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-default-400 hover:text-default-600 focus:outline-none"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <div className="flex items-center justify-between px-1">
        <Checkbox
          size="sm"
          isSelected={rememberMe}
          onValueChange={setRememberMe}
        >
          {t('login.rememberMe')}
        </Checkbox>
      </div>

      <Button
        type="submit"
        color="primary"
        size="lg"
        isLoading={loading}
        className="w-full font-semibold"
      >
        {loading ? t('login.signingIn') : t('login.signIn')}
      </Button>
    </form>
  );
}
