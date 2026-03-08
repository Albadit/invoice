'use client';

import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Lock, User, Save } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { useTranslation } from '@/contexts/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { usePageTitle } from '@/components/layout';
import { StickyHeader } from '@/components/ui';

export default function ProfilePage() {
  const { t } = useTranslation('profile');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { setPageTitle, setPageSubtitle } = usePageTitle();

  useEffect(() => {
    setPageTitle(t('title'));
    setPageSubtitle(t('subtitle'));
    return () => { setPageTitle(''); setPageSubtitle(''); };
  }, [t, setPageTitle, setPageSubtitle]);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        setOriginalEmail(user.email);
      }
    }
    loadUser();
  }, []);

  async function handleSaveProfile() {
    setProfileError('');

    if (!email.trim()) {
      setProfileError(t('info.emailRequired'));
      return;
    }

    if (email === originalEmail) return;

    setSavingProfile(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        if (error.message?.toLowerCase().includes('already') || error.status === 422) {
          setProfileError(t('info.emailTaken'));
        } else {
          setProfileError(t('info.saveFailed'));
        }
        return;
      }

      setOriginalEmail(email);
      addToast({
        title: t('success'),
        description: t('info.saveSuccess'),
        color: "success"
      });
    } catch {
      setProfileError(t('info.saveFailed'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange() {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('password.fieldsRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('password.minLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('password.mismatch'));
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError(t('password.failed'));
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setError(t('password.wrongCurrent'));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(t('password.failed'));
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast({
        title: t('success'),
        description: t('password.success'),
        color: "success"
      });
    } catch {
      setError(t('password.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}/>
      {/* User Info */}
      <Card>
        <CardBody className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <User className="size-5 text-default-500" />
            <h2 className="text-xl font-bold">{t('info.title')}</h2>
          </div>
          <Input
            label={t('info.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {profileError && (
            <p className="text-sm text-danger">{profileError}</p>
          )}
          <Button
            color="primary"
            onClick={handleSaveProfile}
            isLoading={savingProfile}
            isDisabled={email === originalEmail}
            startContent={<Save className="size-4" />}
            className="w-full sm:w-fit sm:ml-auto"
          >
            {t('info.save')}
          </Button>
        </CardBody>
      </Card>

      {/* Change Password */}
      <Card>
        <CardBody className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-default-500" />
            <h2 className="text-xl font-bold">{t('password.title')}</h2>
          </div>
          <p className="text-sm text-default-500">{t('password.subtitle')}</p>
          <Input
            type="password"
            label={t('password.currentPassword')}
            placeholder={t('password.currentPasswordPlaceholder')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            label={t('password.newPassword')}
            placeholder={t('password.newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            label={t('password.confirmPassword')}
            placeholder={t('password.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
          <Button
            color="primary"
            onClick={handlePasswordChange}
            isLoading={saving}
            className="w-full sm:w-fit sm:ml-auto"
          >
            {t('password.submit')}
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
