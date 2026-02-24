'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useTranslation } from '@/contexts/LocaleProvider';

interface EditCompanyModalProps {
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
  }) => Promise<void>;
  initialData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
}

export function EditCompanyModal({ isOpen, onClose, onSave, initialData }: EditCompanyModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setEmail(initialData.email);
      setPhone(initialData.phone);
      setStreet(initialData.street);
      setCity(initialData.city);
      setZipCode(initialData.zipCode);
      setCountry(initialData.country);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        email,
        phone,
        street,
        city,
        zipCode,
        country,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save company:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('companies.editCompany')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('companies.fields.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              placeholder="Acme Corporation"
            />
            <Input
              label={t('companies.fields.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@company.com"
            />
            <Input
              label={t('companies.fields.phone')}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label={t('companies.fields.street')}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="123 Business Street"
            />
            <div className="flex gap-4">
              <Input
                label={t('companies.fields.city')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
              />
              <Input
                label={t('companies.fields.zipCode')}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="10001"
              />
            </div>
            <Input
              label={t('companies.fields.country')}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
            />
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button color="primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
