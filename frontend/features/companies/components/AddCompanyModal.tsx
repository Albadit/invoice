'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { X } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
    vatNumber: string;
    cocNumber: string;
  }) => Promise<void>;
}

export function AddCompanyModal({ isOpen, onClose, onSave }: AddCompanyModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyStreet, setCompanyStreet] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyZipCode, setCompanyZipCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyVatNumber, setCompanyVatNumber] = useState('');
  const [companyCocNumber, setCompanyCocNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!companyName.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        street: companyStreet,
        city: companyCity,
        zipCode: companyZipCode,
        country: companyCountry,
        vatNumber: companyVatNumber,
        cocNumber: companyCocNumber,
      });
      
      // Clear form
      setCompanyName('');
      setCompanyEmail('');
      setCompanyPhone('');
      setCompanyStreet('');
      setCompanyCity('');
      setCompanyZipCode('');
      setCompanyCountry('');
      setCompanyVatNumber('');
      setCompanyCocNumber('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      // Clear form
      setCompanyName('');
      setCompanyEmail('');
      setCompanyPhone('');
      setCompanyStreet('');
      setCompanyCity('');
      setCompanyZipCode('');
      setCompanyCountry('');
      setCompanyVatNumber('');
      setCompanyCocNumber('');
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent>
        <ModalHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t('companies.addCompany')}</h2>
          <Button
            isIconOnly
            variant="light"
            onClick={handleClose}
            disabled={saving}
            startContent={<X className="size-5" />}
          />
        </ModalHeader>
        <ModalBody className="p-6">
          <div className="flex flex-col gap-4">
            <Input 
              label={t('companies.fields.name')}
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              isRequired
              disabled={saving}
            />
            <Input 
              label={t('companies.fields.email')}
              type="email"
              value={companyEmail} 
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="contact@acme.com"
              disabled={saving}
            />
            <Input 
              label={t('companies.fields.phone')}
              type="tel"
              value={companyPhone} 
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              disabled={saving}
            />
            <Input 
              label={t('companies.fields.street')}
              value={companyStreet} 
              onChange={(e) => setCompanyStreet(e.target.value)}
              placeholder="123 Main St"
              disabled={saving}
            />
            <div className="flex gap-4">
              <Input 
                label={t('companies.fields.city')}
                value={companyCity} 
                onChange={(e) => setCompanyCity(e.target.value)}
                placeholder="New York"
                disabled={saving}
              />
              <Input 
                label={t('companies.fields.zipCode')}
                value={companyZipCode} 
                onChange={(e) => setCompanyZipCode(e.target.value)}
                placeholder="10001"
                disabled={saving}
              />
            </div>
            <Input 
              label={t('companies.fields.country')}
              value={companyCountry} 
              onChange={(e) => setCompanyCountry(e.target.value)}
              placeholder="United States"
              disabled={saving}
            />
            <div className="flex gap-4">
              <Input 
                label={t('companies.fields.vatNumber')}
                value={companyVatNumber} 
                onChange={(e) => setCompanyVatNumber(e.target.value)}
                placeholder="NL123456789B01"
                disabled={saving}
              />
              <Input 
                label={t('companies.fields.cocNumber')}
                value={companyCocNumber} 
                onChange={(e) => setCompanyCocNumber(e.target.value)}
                placeholder="12345678"
                disabled={saving}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button 
            variant="light" 
            onClick={handleClose}
            disabled={saving}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button 
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            disabled={!companyName.trim() || saving}
          >
            {saving ? t('actions.saving') : t('companies.addCompany')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
