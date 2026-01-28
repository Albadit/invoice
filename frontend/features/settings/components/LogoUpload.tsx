'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from "@heroui/button";
import { storageApi } from '@/features/settings/api';

interface LogoUploadProps {
  logoUrl: string;
  onLogoUrlChange: (url: string) => void;
  imageError: boolean;
  onImageError: (error: boolean) => void;
}

export function LogoUpload({ logoUrl, onLogoUrlChange, imageError, onImageError }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    onImageError(false);

    try {
      const url = await storageApi.uploadLogo(file);
      onLogoUrlChange(url);
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearLogo = () => {
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

        {isUploading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-sm text-default-600">Uploading...</p>
          </div>
        ) : logoUrl && !imageError ? (
          <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={logoUrl}
              alt="Logo preview"
              width={160}
              height={80}
              className="h-20 w-auto object-contain max-w-xs"
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
              startContent={<X className="h-4 w-4" />}
              onClick={handleClearLogo}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {imageError ? (
                <div className="h-16 w-16 rounded-full bg-danger/20 flex items-center justify-center">
                  <X className="h-8 w-8 text-danger" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-default-200 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-default-400" />
                </div>
              )}
            </div>
            
            {imageError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-sm text-danger">⚠️ Failed to load image from URL</p>
                <p className="text-xs text-danger/80 mt-1">Upload a new image or enter a different URL</p>
              </div>
            )}

            <p className="text-sm text-foreground mb-2">
              <span className="text-primary font-semibold">
                Click to upload
              </span>
              {' '}or drag and drop
            </p>
            <p className="text-xs text-default-500 mb-1">
              PNG, JPG, SVG up to 5MB
            </p>
            <p className="text-xs text-default-400">
              You can also paste an image (Ctrl+V)
            </p>
          </div>
        )}
      </div>

      {logoUrl && imageError && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<X className="h-4 w-4" />}
            onClick={handleClearLogo}
          >
            Clear URL
          </Button>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<Upload className="h-4 w-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload New Image
          </Button>
        </div>
      )}
    </div>
  );
}
