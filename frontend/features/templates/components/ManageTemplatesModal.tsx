'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Edit, Trash, Plus, Lock } from 'lucide-react';
import type { Template } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onAdd: () => void;
}

export function ManageTemplatesModal({
  isOpen,
  onClose,
  templates,
  onEdit,
  onDelete,
  onAdd,
}: ManageTemplatesModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('templates.manageTemplates')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {templates.length === 0 ? (
              <p className="text-slate-600 text-center py-8">{t('templates.noData')}</p>
            ) : (
              templates.map((template) => {
                const isSystem = 'is_system' in template && template.is_system;
                return (
                <div
                  key={template.id}
                  className="flex md:flex-row flex-col md:items-center gap-4 justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{template.name}</p>
                    {isSystem && (
                      <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>
                        {t('templates.system')}
                      </Chip>
                    )}
                  </div>
                  <div className="flex md:flex-row flex-col gap-2">
                    {!isSystem && (
                      <>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<Edit className="size-4" />}
                          onClick={() => onEdit(template)}
                        >
                          {tCommon('actions.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          color="danger"
                          startContent={<Trash className="size-4" />}
                          onClick={() => onDelete(template.id)}
                        >
                          {tCommon('actions.delete')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.close')}
          </Button>
          <Button
            color="primary"
            startContent={<Plus className="size-4" />}
            onClick={onAdd}
          >
            {t('templates.addTemplate')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
