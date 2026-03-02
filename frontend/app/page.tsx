'use client';

import Link from 'next/link';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import {
  FileText,
  LayoutDashboard,
  Palette,
  Globe,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
} from 'lucide-react';
import { AUTH_ROUTES, PROTECTED_ROUTES } from '@/config/routes';
import { LanguageSwitcher, ThemeSwitch } from '@/components/ui';
import { useTranslation } from '@/contexts/LocaleProvider';

export default function HomePage() {
  const { t } = useTranslation('home');
  const { t: tCommon } = useTranslation('common');

  const features = [
    {
      icon: FileText,
      title: t('features.invoicing.title'),
      description: t('features.invoicing.description'),
    },
    {
      icon: LayoutDashboard,
      title: t('features.dashboard.title'),
      description: t('features.dashboard.description'),
    },
    {
      icon: Palette,
      title: t('features.templates.title'),
      description: t('features.templates.description'),
    },
    {
      icon: Globe,
      title: t('features.multilingual.title'),
      description: t('features.multilingual.description'),
    },
    {
      icon: Zap,
      title: t('features.fast.title'),
      description: t('features.fast.description'),
    },
    {
      icon: Shield,
      title: t('features.secure.title'),
      description: t('features.secure.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-default-50">
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-default-200 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-foreground">
              {tCommon('app.title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitch />
            <Button
              as={Link}
              href={AUTH_ROUTES.login}
              color="primary"
              variant="flat"
              size="sm"
            >
              {t('signIn')}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-125 w-200 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-default-200 bg-background px-4 py-1.5 text-sm text-default-600">
            <Zap size={14} className="text-primary" />
            {t('badge')}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-default-500 sm:text-xl">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              as={Link}
              href={AUTH_ROUTES.login}
              color="primary"
              size="lg"
              endContent={<ArrowRight size={18} />}
            >
              {t('hero.cta')}
            </Button>
            <Button
              as={Link}
              href={PROTECTED_ROUTES.dashboard}
              variant="bordered"
              size="lg"
            >
              {t('hero.secondary')}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="border-t border-default-200 bg-background py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t('features.heading')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-default-500">
              {t('features.subheading')}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                shadow="sm"
                className="border border-default-100"
              >
                <CardBody className="gap-3 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-default-500">
                    {feature.description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Highlights ─────────────────────────────────────────── */}
      <section className="border-t border-default-200 bg-default-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t('highlights.heading')}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              t('highlights.items.0'),
              t('highlights.items.1'),
              t('highlights.items.2'),
              t('highlights.items.3'),
              t('highlights.items.4'),
              t('highlights.items.5'),
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-default-200 bg-background p-4">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-default-200 bg-primary py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-100">
            {t('cta.subtitle')}
          </p>
          <Button
            as={Link}
            href={AUTH_ROUTES.login}
            className="mt-8"
            color="default"
            size="lg"
            variant="solid"
            endContent={<ArrowRight size={18} />}
          >
            {t('cta.button')}
          </Button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-default-200 bg-background py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-default-400 sm:px-6">
          &copy; {new Date().getFullYear()} {tCommon('app.title')}. {t('footer.rights')}
        </div>
      </footer>
    </div>
  );
}
