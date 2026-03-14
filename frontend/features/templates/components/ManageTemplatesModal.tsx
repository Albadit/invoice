'use client';

import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Edit, Trash, Lock } from 'lucide-react';
import type { Template } from '@/lib/types';
import { ManageModal } from '@/components/ui/ManageModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onAdd: () => void;
}

export function ManageTemplatesModal({ isOpen, onClose, templates, onEdit, onDelete, onAdd }: ManageTemplatesModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <ManageModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('templates.manageTemplates')}
      items={templates}
      emptyMessage={t('templates.noData')}
      addLabel={t('templates.addTemplate')}
      onAdd={onAdd}
      keyExtractor={(template) => template.id}
      renderItem={(template) => {
        const isSystem = 'is_system' in template && template.is_system;
        return (
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-divider rounded-lg hover:bg-default-100 transition-colors">
            <div className="w-full flex justify-between items-center gap-2">
              <p className="font-semibold">{template.name}</p>
            </div>
            {isSystem && (
              <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>{t('templates.system')}</Chip>
            )}
            {!isSystem && (
              <div className="flex md:flex-row flex-col gap-2">
                <Button size="sm" variant="flat" color="primary" startContent={<Edit className="size-4" />} onClick={() => onEdit(template)}>{tCommon('actions.edit')}</Button>
                <Button size="sm" variant="flat" color="danger" startContent={<Trash className="size-4" />} onClick={() => onDelete(template.id)}>{tCommon('actions.delete')}</Button>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
