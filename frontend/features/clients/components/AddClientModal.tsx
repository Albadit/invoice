'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { useTranslation } from '@/contexts/LocaleProvider';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zipCode: string;
    country: string;
    taxId: string;
    notes: string;
  }) => Promise<void>;
}

export function AddClientModal({ isOpen, onClose, onSave }: AddClientModalProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ name, email, phone, street, city, zipCode, country, taxId, notes });
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setStreet('');
      setCity('');
      setZipCode('');
      setCountry('');
      setTaxId('');
      setNotes('');
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('clients.addClient')}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <Input
              label={t('clients.fields.name')}
              labelPlacement="outside"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('clients.fields.name')}
              isRequired
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('clients.fields.email')}
                labelPlacement="outside"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('clients.fields.email')}
              />
              <Input
                label={t('clients.fields.phone')}
                labelPlacement="outside"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('clients.fields.phone')}
              />
            </div>
            <Input
              label={t('clients.fields.street')}
              labelPlacement="outside"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder={t('clients.fields.street')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t('clients.fields.city')}
                labelPlacement="outside"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('clients.fields.city')}
              />
              <Input
                label={t('clients.fields.zipCode')}
                labelPlacement="outside"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder={t('clients.fields.zipCode')}
              />
              <Input
                label={t('clients.fields.country')}
                labelPlacement="outside"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t('clients.fields.country')}
              />
            </div>
            <Input
              label={t('clients.fields.taxId')}
              labelPlacement="outside"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder={t('clients.fields.taxId')}
            />
            <Textarea
              label={t('clients.fields.notes')}
              labelPlacement="outside"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('clients.fields.notes')}
            />
          </div>
        </ModalBody>
        <ModalFooter className="flex md:flex-row flex-col-reverse">
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            isDisabled={!name.trim()}
          >
            {tCommon('actions.create')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
