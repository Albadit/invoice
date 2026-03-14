'use client';

import { Button } from "@heroui/button";
import { Edit, Trash } from 'lucide-react';
import type { Company } from '@/lib/types';
import { ManageModal } from '@/components/ui/ManageModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ManageCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
  onAdd: () => void;
}

export function ManageCompaniesModal({ isOpen, onClose, companies, onEdit, onDelete, onAdd }: ManageCompaniesModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  return (
    <ManageModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('companies.manageCompanies')}
      items={companies}
      emptyMessage={t('companies.noData')}
      addLabel={t('companies.addCompany')}
      onAdd={onAdd}
      keyExtractor={(company) => company.id}
      renderItem={(company) => (
        <div className="flex md:flex-row flex-col md:items-center gap-4 justify-between p-4 border border-divider rounded-lg hover:bg-default-100 transition-colors">
          <div>
            <p className="font-semibold">{company.name}</p>
            {company.email && <p className="text-sm text-default-500">{company.email}</p>}
            {company.city && company.country && <p className="text-sm text-default-500">{company.city}, {company.country}</p>}
          </div>
          <div className="flex md:flex-row flex-col gap-2">
            <Button size="sm" variant="flat" color="primary" startContent={<Edit className="size-4" />} onClick={() => onEdit(company)}>{tCommon('actions.edit')}</Button>
            <Button size="sm" variant="flat" color="danger" startContent={<Trash className="size-4" />} onClick={() => onDelete(company.id)}>{tCommon('actions.delete')}</Button>
          </div>
        </div>
      )}
    />
  );
}
