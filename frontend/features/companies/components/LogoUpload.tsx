'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from "@heroui/button";
import { useTranslation } from '@/contexts/LocaleProvider';

interface LogoUploadProps {
  logoUrl: string;
  onLogoUrlChange: (url: string) => void;
  onPendingFileChange: (file: File | null) => void;
  imageError: boolean;
  onImageError: (error: boolean) => void;
}

export function LogoUpload({ logoUrl, onLogoUrlChange, onPendingFileChange, imageError, onImageError }: LogoUploadProps) {
  const { t } = useTranslation('settings');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('logo.invalidType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('logo.tooLarge'));
      return;
    }

    onImageError(false);

    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create local preview and store the pending file
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    onPendingFileChange(file);
    onLogoUrlChange(objectUrl);
  };

  const handleClearLogo = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onPendingFileChange(null);
    onLogoUrlChange('');
    onImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleFileUpload(file);
        }
        break;
      }
    }
  };

  const handleClickToUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={handleClickToUpload}
        tabIndex={0}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-default-300 bg-default-100 hover:border-default-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="logo-upload"
        />

        {logoUrl && !imageError ? (
          <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={logoUrl}
              alt={t('logo.preview')}
              width={160}
              height={80}
              unoptimized
              className="h-20 w-auto object-contain max-w-xs"
              style={{ width: 'auto', height: 'auto' }}
              onLoad={() => onImageError(false)}
              onError={() => {
                console.error('Failed to load image:', logoUrl);
                onImageError(true);
              }}
            />
            <Button
              size="sm"
              color="danger"
              variant="flat"
              startContent={<X className="size-4" />}
              onClick={handleClearLogo}
            >
              {t('logo.remove')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex justify-center">
              {imageError ? (
                <div className="size-16 rounded-full bg-danger/20 flex items-center justify-center">
                  <X className="size-8 text-danger" />
                </div>
              ) : (
                <div className="size-16 rounded-full bg-default-200 flex items-center justify-center">
                  <ImageIcon className="size-8 text-default-400" />
                </div>
              )}
            </div>
            
            {imageError && (
              <div className="flex flex-col gap-1 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-sm text-danger">⚠️ {t('logo.failedToLoad')}</p>
                <p className="text-xs text-danger/80">{t('logo.uploadNewOrChange')}</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-sm text-foreground">
                <span className="text-primary font-semibold">
                  {t('logo.clickToUpload')}
                </span>
                {' '}{t('logo.orDragDrop')}
              </p>
              <p className="text-xs text-default-500">
                {t('logo.fileTypes')}
              </p>
              <p className="text-xs text-default-400">
                {t('logo.pasteHint')}
              </p>
            </div>
          </div>
        )}
      </div>

      {logoUrl && imageError && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<X className="size-4" />}
            onClick={handleClearLogo}
          >
            {t('logo.clearUrl')}
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<Upload className="size-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('logo.uploadNew')}
          </Button>
        </div>
      )}
    </div>
  );
}
