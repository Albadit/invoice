'use client';

import { useState } from 'react';
import { Input } from "@heroui/input";
import { FormModal } from '@/components/ui/FormModal';
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: {
    name: string; email: string; phone: string; street: string;
    city: string; zipCode: string; country: string; vatNumber: string; cocNumber: string; bankNumber: string;
  }) => Promise<void>;
}

export function AddCompanyModal({ isOpen, onClose, onSave }: AddCompanyModalProps) {
  const { t } = useTranslation('settings');
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyStreet, setCompanyStreet] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyZipCode, setCompanyZipCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyVatNumber, setCompanyVatNumber] = useState('');
  const [companyCocNumber, setCompanyCocNumber] = useState('');
  const [companyBankNumber, setCompanyBankNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: companyName, email: companyEmail, phone: companyPhone, street: companyStreet, city: companyCity, zipCode: companyZipCode, country: companyCountry, vatNumber: companyVatNumber, cocNumber: companyCocNumber, bankNumber: companyBankNumber });
      setCompanyName(''); setCompanyEmail(''); setCompanyPhone(''); setCompanyStreet('');
      setCompanyCity(''); setCompanyZipCode(''); setCompanyCountry(''); setCompanyVatNumber(''); setCompanyCocNumber(''); setCompanyBankNumber('');
    } finally { setSaving(false); }
  };

  const handleClose = () => {
    if (!saving) {
      setCompanyName(''); setCompanyEmail(''); setCompanyPhone(''); setCompanyStreet('');
      setCompanyCity(''); setCompanyZipCode(''); setCompanyCountry(''); setCompanyVatNumber(''); setCompanyCocNumber(''); setCompanyBankNumber('');
      onClose();
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={handleClose} title={t('companies.addCompany')} onSave={handleSave} saving={saving} saveLabel={saving ? t('actions.saving') : t('companies.addCompany')} saveDisabled={!companyName.trim()} size="3xl">
      <Input label={t('companies.fields.name')} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" isRequired disabled={saving} />
      <Input label={t('companies.fields.email')} type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contact@acme.com" disabled={saving} />
      <Input label={t('companies.fields.phone')} type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+1 234 567 8900" disabled={saving} />
      <Input label={t('companies.fields.street')} value={companyStreet} onChange={(e) => setCompanyStreet(e.target.value)} placeholder="123 Main St" disabled={saving} />
      <div className="flex gap-4">
        <Input label={t('companies.fields.city')} value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="New York" disabled={saving} />
        <Input label={t('companies.fields.zipCode')} value={companyZipCode} onChange={(e) => setCompanyZipCode(e.target.value)} placeholder="10001" disabled={saving} />
      </div>
      <Input label={t('companies.fields.country')} value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} placeholder="United States" disabled={saving} />
      <div className="flex gap-4">
        <Input label={t('companies.fields.vatNumber')} value={companyVatNumber} onChange={(e) => setCompanyVatNumber(e.target.value)} placeholder="NL123456789B01" disabled={saving} />
        <Input label={t('companies.fields.cocNumber')} value={companyCocNumber} onChange={(e) => setCompanyCocNumber(e.target.value)} placeholder="12345678" disabled={saving} />
      </div>
      <Input label={t('companies.fields.bankNumber')} value={companyBankNumber} onChange={(e) => setCompanyBankNumber(e.target.value)} placeholder="NL91ABNA0417164300" disabled={saving} />
    </FormModal>
  );
}
