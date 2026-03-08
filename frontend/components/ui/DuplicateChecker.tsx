'use client';

import { useState } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Trash2, ArrowRight, ArrowLeft, Building2, Users, FileText, Check } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { useTranslation } from '@/contexts/LocaleProvider';
import type { DuplicateGroup, DuplicateRecord } from '@/app/(protected)/backup/duplicates/route';

export interface DuplicateCheckerProps {
  groups: DuplicateGroup[];
  onBack: () => void;
  onFinish: () => void;
}

const typeIcons = {
  company: Building2,
  client: Users,
  invoice: FileText,
};

function RecordCard({
  record,
  isDeleting,
  onDelete,
  t,
}: {
  record: DuplicateRecord;
  isDeleting: boolean;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const fields = Object.entries(record.fields).filter(([, v]) => v != null);

  return (
    <Card className="border border-default-200 flex-1">
      <CardBody className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{record.label}</p>
            {record.sublabel && (
              <p className="text-xs text-default-500 truncate">{record.sublabel}</p>
            )}
          </div>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            isLoading={isDeleting}
            onPress={onDelete}
            startContent={!isDeleting ? <Trash2 className="size-3.5" /> : undefined}
          >
            {t('backup.duplicates.delete')}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          {fields.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-default-400 w-20 shrink-0 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-default-700 truncate">{val}</span>
            </div>
          ))}
        </div>

        {record.created_at && (
          <p className="text-[11px] text-default-400 mt-auto">
            {t('backup.duplicates.created')}: {new Date(record.created_at).toLocaleString()}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export function DuplicateChecker({ groups, onBack, onFinish }: DuplicateCheckerProps) {
  const { t } = useTranslation('settings');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [remainingGroups, setRemainingGroups] = useState(groups);

  const total = remainingGroups.length;
  const group = remainingGroups[currentIndex];

  async function handleDelete(record: DuplicateRecord) {
    if (!group) return;
    setDeletingId(record.id);
    try {
      const res = await fetch('/backup/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: group.type, id: record.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }

      addToast({ title: t('messages.success'), description: t('backup.duplicates.deleted'), color: 'success' });

      // Update the group — remove the deleted record
      setRemainingGroups(prev => {
        const updated = [...prev];
        const g = { ...updated[currentIndex] };
        g.records = g.records.filter(r => r.id !== record.id);
        if (g.records.length < 2) {
          // No more duplicates in this group — remove it
          updated.splice(currentIndex, 1);
          if (currentIndex >= updated.length && updated.length > 0) {
            setCurrentIndex(updated.length - 1);
          }
        } else {
          updated[currentIndex] = g;
        }
        return updated;
      });
    } catch {
      addToast({ title: t('messages.error'), description: t('backup.duplicates.deleteError'), color: 'danger' });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      // Collect all IDs to delete (keep oldest per group)
      const items: { type: string; id: string }[] = [];
      for (const g of remainingGroups) {
        const sorted = [...g.records].sort((a, b) =>
          (a.created_at ?? '').localeCompare(b.created_at ?? ''),
        );
        for (let i = 1; i < sorted.length; i++) {
          items.push({ type: g.type, id: sorted[i].id });
        }
      }
      const res = await fetch('/backup/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      addToast({ title: t('messages.success'), description: t('backup.duplicates.deletedAll', { count: data.deleted ?? items.length }), color: 'success' });
      setRemainingGroups([]);
      setCurrentIndex(0);
    } catch {
      addToast({ title: t('messages.error'), description: t('backup.duplicates.deleteError'), color: 'danger' });
    } finally {
      setDeletingAll(false);
    }
  }

  // All done
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="p-4 rounded-full bg-success/10">
          <Check className="size-8 text-success" />
        </div>
        <h3 className="text-lg font-semibold">{t('backup.duplicates.noDuplicates')}</h3>
        <p className="text-sm text-default-500">{t('backup.duplicates.allClean')}</p>
        <Button color="primary" onPress={onFinish}>{t('backup.duplicates.done')}</Button>
      </div>
    );
  }

  const Icon = typeIcons[group.type];
  const typeLabel = t(`backup.${group.type === 'company' ? 'companies' : group.type === 'client' ? 'clients' : 'invoices'}`);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Chip size="sm" variant="flat" color="warning">
            <Icon className="size-3 inline mr-1" />
            {typeLabel}
          </Chip>
          <span className="text-sm text-default-500">
            {t('backup.duplicates.groupLabel', { name: group.key.split('||')[0] })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            color="danger"
            variant="flat"
            isLoading={deletingAll}
            onPress={handleDeleteAll}
            startContent={!deletingAll ? <Trash2 className="size-3.5" /> : undefined}
          >
            {t('backup.duplicates.deleteAll', { count: total })}
          </Button>
          <Chip size="sm" variant="flat">
            {currentIndex + 1} / {total}
          </Chip>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-default-600">
        {t('backup.duplicates.instruction', { count: group.records.length })}
      </p>

      {/* Records side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {group.records.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            isDeleting={deletingId === record.id}
            onDelete={() => handleDelete(record)}
            t={t}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="flat"
          size="sm"
          isDisabled={currentIndex === 0}
          onPress={() => setCurrentIndex(i => i - 1)}
          startContent={<ArrowLeft className="size-4" />}
        >
          {t('backup.duplicates.prev')}
        </Button>

        <Button
          variant="flat"
          size="sm"
          onPress={() => {
            if (currentIndex < total - 1) {
              setCurrentIndex(i => i + 1);
            } else {
              onFinish();
            }
          }}
          endContent={currentIndex < total - 1 ? <ArrowRight className="size-4" /> : undefined}
        >
          {currentIndex < total - 1
            ? t('backup.duplicates.next')
            : t('backup.duplicates.done')}
        </Button>
      </div>
    </div>
  );
}
