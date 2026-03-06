'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Copy, Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LocaleProvider';

interface ResetLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetLink: string;
  userEmail: string;
}

export function ResetLinkModal({ isOpen, onClose, resetLink, userEmail }: ResetLinkModalProps) {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>{t('resetLink.title')}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500 mb-2">
            {t('resetLink.description', { email: userEmail })}
          </p>
          <div className="flex gap-2">
            <Input
              value={resetLink}
              readOnly
              classNames={{ input: 'text-xs' }}
            />
            <Button
              isIconOnly
              variant="flat"
              color={copied ? 'success' : 'primary'}
              onClick={handleCopy}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-warning-600 mt-2">
            {t('resetLink.expiry')}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onClick={onClose}>
            {tCommon('actions.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
