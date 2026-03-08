'use client';

import { useState, useRef } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Download, Upload, Database, ArrowUpFromLine, ArrowDownToLine, AlertTriangle, ArrowLeft, Copy } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { StickyHeader, ImportPreviewPanel, DuplicateChecker } from '@/components/ui';
import type { PreviewData, OverwriteSelection } from '@/components/ui';
import type { ImportPreviewPanelHandle } from '@/components/ui/ImportPreviewPanel';
import type { DuplicateGroup } from '@/app/(protected)/backup/duplicates/route';
import { useTranslation } from '@/contexts/LocaleProvider';

export default function BackupPage() {
  const { t } = useTranslation('settings');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [pendingSql, setPendingSql] = useState<string | null>(null);
  const [totalSelected, setTotalSelected] = useState(0);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewPanelRef = useRef<ImportPreviewPanelHandle>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/backup/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-backup-${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ title: t('messages.success'), description: t('backup.exportSuccess'), color: 'success' });
    } catch {
      addToast({ title: t('messages.error'), description: t('backup.exportError'), color: 'danger' });
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const sql = await file.text();

      // Quick check: how many new vs duplicate records?
      const previewRes = await fetch('/backup/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: sql,
      });

      let newCount = 0;
      let totalCount = 0;
      if (previewRes.ok) {
        const preview: PreviewData = await previewRes.json();
        newCount = preview.companies.new.length + preview.clients.new.length + preview.invoices.new.length;
        totalCount = newCount + preview.companies.conflicts.length + preview.clients.conflicts.length + preview.invoices.conflicts.length;
        if (newCount === 0) {
          addToast({ title: t('messages.error'), description: t('backup.importAlreadyExists'), color: 'warning' });
          return;
        }
      }

      const res = await fetch('/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: sql,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Import failed');
      }

      if (totalCount > 0 && newCount < totalCount) {
        const skipped = totalCount - newCount;
        addToast({
          title: t('messages.success'),
          description: t('backup.importPartial', { imported: newCount, total: totalCount, skipped }),
          color: 'success',
        });
      } else {
        addToast({ title: t('messages.success'), description: t('backup.importAll', { count: newCount || '' }).trim(), color: 'success' });
      }
    } catch {
      addToast({ title: t('messages.error'), description: t('backup.importError'), color: 'danger' });
    } finally {
      setImporting(false);
    }
  }

  async function handleImportConfirm(overwrite: OverwriteSelection) {
    if (!pendingSql) return;
    setImporting(true);
    try {
      const hasOverwrites = overwrite.companies.length > 0 || overwrite.clients.length > 0 || overwrite.invoices.length > 0;
      const res = await fetch('/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': hasOverwrites ? 'application/json' : 'text/plain' },
        body: hasOverwrites
          ? JSON.stringify({ sql: pendingSql, overwrite })
          : pendingSql,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Import failed');
      }
      addToast({ title: t('messages.success'), description: t('backup.importSuccess'), color: 'success' });
      setPreviewData(null);
      setPendingSql(null);
    } catch {
      addToast({ title: t('messages.error'), description: t('backup.importError'), color: 'danger' });
    } finally {
      setImporting(false);
    }
  }

  function handleBack() {
    setPreviewData(null);
    setPendingSql(null);
  }

  async function handleCheckDuplicates() {
    setCheckingDuplicates(true);
    try {
      const res = await fetch('/backup/duplicates');
      if (!res.ok) {
        setDuplicateGroups([]);
        return;
      }
      const data = await res.json();
      setDuplicateGroups(data.groups ?? []);
    } catch {
      setDuplicateGroups([]);
    } finally {
      setCheckingDuplicates(false);
    }
  }

  // ─── Duplicates view ──────────────────────────────────────────
  if (duplicateGroups !== null) {
    return (
      <main className="min-h-screen max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
        <StickyHeader title={t('backup.duplicates.title')} subtitle={t('backup.duplicates.subtitle')}>
          <div className="sm:ml-auto shrink-0">
            <Button variant="flat" onPress={() => setDuplicateGroups(null)} startContent={<ArrowLeft className="size-4" />}>
              {t('backup.backToBackup')}
            </Button>
          </div>
        </StickyHeader>
        <DuplicateChecker
          groups={duplicateGroups}
          onBack={() => setDuplicateGroups(null)}
          onFinish={() => setDuplicateGroups(null)}
        />
      </main>
    );
  }

  // ─── Preview view (after file selected) ───────────────────────
  if (previewData) {
    return (
      <main className="min-h-screen max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
        <StickyHeader title={t('backup.previewTitle')} subtitle={t('backup.description')}>
          <div className="sm:ml-auto shrink-0 flex flex-row gap-2">
            <Button variant="flat" onPress={handleBack} isDisabled={importing} startContent={<ArrowLeft className="size-4" />}>
              {t('backup.backToBackup')}
            </Button>
            <Button
              color={totalSelected > 0 ? 'warning' : 'primary'}
              onPress={() => {
                if (previewPanelRef.current) previewPanelRef.current.confirm();
              }}
              isLoading={importing}
            >
              {totalSelected > 0
                ? t('backup.importAndOverwrite', { count: totalSelected })
                : t('backup.importSkipExisting')}
            </Button>
          </div>
        </StickyHeader>
        <ImportPreviewPanel
          ref={previewPanelRef}
          preview={previewData}
          onConfirm={handleImportConfirm}
          isLoading={importing}
          onSelectionChange={setTotalSelected}
        />
      </main>
    );
  }

  // ─── Default view (export & import cards) ─────────────────────
  return (
    <main className="min-h-screen max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
      <StickyHeader title={t('backup.title')} subtitle={t('backup.description')} />

      {/* Export, Import & Duplicate cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Export card */}
        <Card className="border border-default-200">
          <CardBody className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <ArrowUpFromLine className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('backup.export')}</h3>
                <p className="text-xs text-default-500">{t('backup.exportDescription')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-default-400">
              <Database className="size-3.5" />
              <span>{t('backup.exportIncludes')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip size="sm" variant="flat" color="primary">{t('backup.companies')}</Chip>
              <Chip size="sm" variant="flat" color="primary">{t('backup.clients')}</Chip>
              <Chip size="sm" variant="flat" color="primary">{t('backup.invoices')}</Chip>
            </div>
            <Button
              color="primary"
              startContent={<Download className="size-4" />}
              isLoading={exporting}
              onPress={handleExport}
              className="mt-auto"
            >
              {t('backup.export')}
            </Button>
          </CardBody>
        </Card>

        {/* Import card */}
        <Card className="border border-default-200">
          <CardBody className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-warning/10">
                <ArrowDownToLine className="size-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('backup.import')}</h3>
                <p className="text-xs text-default-500">{t('backup.importDescription')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-default-400">
              <AlertTriangle className="size-3.5" />
              <span>{t('backup.importNote')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip size="sm" variant="flat" color="success">{t('backup.newRecords', { count: '' }).trim()}</Chip>
              <Chip size="sm" variant="flat" color="warning">{t('backup.conflictRecords', { count: '' }).trim()}</Chip>
            </div>
            <Button
              color="warning"
              startContent={<Upload className="size-4" />}
              isLoading={importing}
              onPress={() => fileInputRef.current?.click()}
              className="mt-auto"
            >
              {t('backup.import')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardBody>
        </Card>

        {/* Duplicate check card */}
        <Card className="border border-default-200">
          <CardBody className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-secondary/10">
                <Copy className="size-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('backup.duplicates.title')}</h3>
                <p className="text-xs text-default-500">{t('backup.duplicates.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-default-400">
              <Database className="size-3.5" />
              <span>{t('backup.duplicates.instruction', { count: '' }).trim()}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip size="sm" variant="flat" color="secondary">{t('backup.companies')}</Chip>
              <Chip size="sm" variant="flat" color="secondary">{t('backup.clients')}</Chip>
              <Chip size="sm" variant="flat" color="secondary">{t('backup.invoices')}</Chip>
            </div>
            <Button
              color="secondary"
              startContent={!checkingDuplicates ? <Copy className="size-4" /> : undefined}
              isLoading={checkingDuplicates}
              onPress={handleCheckDuplicates}
              className="mt-auto"
            >
              {t('backup.duplicates.check')}
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Warning notice */}
      <Card className="border border-warning/30 bg-warning/5">
        <CardBody className="flex flex-row items-start gap-3 p-4">
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('backup.warning')}</p>
            <p className="text-sm text-default-600 mt-1">{t('backup.warningText')}</p>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
