'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Edit, Trash, Plus } from 'lucide-react';
import type { Company } from '@/lib/types';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
  onAdd: () => void;
}

export function ManageCompaniesModal({
  isOpen,
  onClose,
  companies,
  onEdit,
  onDelete,
  onAdd,
}: ManageCompaniesModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('companies.manageCompanies')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-3">
            {companies.length === 0 ? (
              <p className="text-slate-600 text-center py-8">{t('companies.noData')}</p>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="flex md:flex-row flex-col md:items-center gap-4 justify-between p-4 border border-divider rounded-lg hover:bg-default-100 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{company.name}</p>
                    {company.email && (
                      <p className="text-sm text-default-500">{company.email}</p>
                    )}
                    {company.city && company.country && (
                      <p className="text-sm text-default-500">
                        {company.city}, {company.country}
                      </p>
                    )}
                  </div>
                  <div className="flex md:flex-row flex-col gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      startContent={<Edit className="size-4" />}
                      onClick={() => onEdit(company)}
                    >
                      {tCommon('actions.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Trash className="size-4" />}
                      onClick={() => onDelete(company.id)}
                    >
                      {tCommon('actions.delete')}
                    </Button>
                  </div>
                </div>
              ))
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
            {t('companies.addCompany')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
