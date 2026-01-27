'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { X } from 'lucide-react';

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
  }) => Promise<void>;
}

export function AddCompanyModal({ isOpen, onClose, onSave }: AddCompanyModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyStreet, setCompanyStreet] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyZipCode, setCompanyZipCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
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
      });
      
      // Clear form
      setCompanyName('');
      setCompanyEmail('');
      setCompanyPhone('');
      setCompanyStreet('');
      setCompanyCity('');
      setCompanyZipCode('');
      setCompanyCountry('');
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
        <ModalHeader className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">Add New Company</h2>
          <Button
            isIconOnly
            variant="light"
            onClick={handleClose}
            disabled={saving}
            startContent={<X className="h-5 w-5" />}
          />
        </ModalHeader>
        <ModalBody className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-semibold block mb-2">Company Name *</span>
              <Input 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                isRequired
                disabled={saving}
              />
            </div>
            <div>
              <span className="text-sm font-semibold block mb-2">Email</span>
              <Input 
                type="email"
                value={companyEmail} 
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="contact@acme.com"
                disabled={saving}
              />
            </div>
            <div>
              <span className="text-sm font-semibold block mb-2">Phone</span>
              <Input 
                type="tel"
                value={companyPhone} 
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                disabled={saving}
              />
            </div>
            <div>
              <span className="text-sm font-semibold block mb-2">Street</span>
              <Input 
                value={companyStreet} 
                onChange={(e) => setCompanyStreet(e.target.value)}
                placeholder="123 Main St"
                disabled={saving}
              />
            </div>
            <div>
              <span className="text-sm font-semibold block mb-2">City</span>
              <Input 
                value={companyCity} 
                onChange={(e) => setCompanyCity(e.target.value)}
                placeholder="New York"
                disabled={saving}
              />
            </div>
            <div>
              <span className="text-sm font-semibold block mb-2">Zip Code</span>
              <Input 
                value={companyZipCode} 
                onChange={(e) => setCompanyZipCode(e.target.value)}
                placeholder="10001"
                disabled={saving}
              />
            </div>
            <div className="col-span-2">
              <span className="text-sm font-semibold block mb-2">Country</span>
              <Input 
                value={companyCountry} 
                onChange={(e) => setCompanyCountry(e.target.value)}
                placeholder="United States"
                disabled={saving}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t px-6 py-4">
          <Button 
            variant="light" 
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            color="primary"
            onClick={handleSave}
            isLoading={saving}
            disabled={!companyName.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save Company'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
