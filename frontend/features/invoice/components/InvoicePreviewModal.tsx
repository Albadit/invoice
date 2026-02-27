'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Download, X } from 'lucide-react';
import { format } from 'date-fns';
import type { InvoiceWithItems } from '@/lib/types';
import { formatWithCurrency } from '@/lib/utils';
import { getStatusBadge, getEffectiveStatus } from '@/features/invoice/utils/invoice-utils';
import { useTranslation } from '@/contexts/LocaleProvider';
import { tl } from '@/lib/i18n/translate';
import type { Translations } from '@/lib/i18n/translate';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceWithItems | null;
  onDownload: (invoiceId: string) => void;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  onDownload,
}: InvoicePreviewModalProps) {
  const { t } = useTranslation('invoice');
  const [labels, setLabels] = useState<Translations>({});

  useEffect(() => {
    if (!invoice) return;
    const lang = invoice.language || 'en';
    import(`@/locales/${lang}/invoice.json`)
      .then((mod) => setLabels(mod.default || mod))
      .catch(() => import(`@/locales/en/invoice.json`).then((mod) => setLabels(mod.default || mod)));
  }, [invoice]);

  if (!invoice) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      hideCloseButton
      classNames={{
        base: 'mx-0 sm:mx-4',
        body: 'p-0',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex justify-between items-center border-b px-4 sm:px-6 py-3 sm:py-4">
          <h2 className="text-lg sm:text-xl font-semibold">{t('preview.title')}</h2>
          <Button
            isIconOnly
            variant="light"
            onClick={onClose}
            startContent={<X className="size-5" />}
          />
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4 sm:gap-8 p-4 sm:p-12">
            {/* Invoice Header */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                {invoice.company?.logo_url ? (
                  <Image src={invoice.company.logo_url} alt="Logo" width={128} height={64} unoptimized className="h-12 sm:h-16 w-auto object-contain" />
                ) : (
                  <div className="h-12 sm:h-16 w-24 sm:w-32 bg-default-200 rounded flex items-center justify-center text-default-500 text-sm font-bold">
                    Logo
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:gap-2 sm:text-right">
                  <h2 className="text-2xl sm:text-4xl font-bold text-foreground">{tl(labels, 'preview.invoiceTitle') || 'INVOICE'}</h2>
                  <p className="text-lg sm:text-2xl text-default-500 font-semibold">#{invoice.invoice_code}</p>
                </div>
              </div>
              
              {/* Company Info and Invoice Details */}
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-col">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{invoice.company?.name || ''}</h1>
                  {invoice.company?.street && <p className="text-sm text-default-500">{invoice.company.street}</p>}
                  {(invoice.company?.city || invoice.company?.zip_code) && (
                    <p className="text-sm text-default-500">
                      {invoice.company.city}{invoice.company.zip_code ? `, ${invoice.company.zip_code}` : ''}
                    </p>
                  )}
                  {invoice.company?.country && <p className="text-sm text-default-500">{invoice.company.country}</p>}
                  {invoice.company?.email && <p className="text-sm text-default-500">{invoice.company.email}</p>}
                  {invoice.company?.phone && <p className="text-sm text-default-500">{invoice.company.phone}</p>}
                  {invoice.company?.vat_number && (
                    <p className="text-sm text-default-500">
                      <span className="font-semibold">{tl(labels, 'preview.vatNumber') || 'VAT'}:</span> {invoice.company.vat_number}
                    </p>
                  )}
                  {invoice.company?.coc_number && (
                    <p className="text-sm text-default-500">
                      <span className="font-semibold">{tl(labels, 'preview.cocNumber') || 'CoC'}:</span> {invoice.company.coc_number}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase">{tl(labels, 'preview.invoiceDetails') || 'Invoice Details'}</h3>
                  <div className="text-default-600 space-y-1 text-sm">
                    <div>
                      <span className="font-semibold">{tl(labels, 'preview.date') || 'Date:'} </span>
                      {format(new Date(invoice.issue_date || invoice.created_at || ''), 'MMM dd, yyyy')}
                    </div>
                    {invoice.due_date && (
                      <div>
                        <span className="font-semibold">{tl(labels, 'preview.dueDate') || 'Due Date:'} </span>
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">{t('preview.status') || 'Status:'} </span>
                      {getStatusBadge(getEffectiveStatus(invoice.status, invoice.due_date), {
                        pending: t('status.pending'),
                        paid: t('status.paid'),
                        overdue: t('status.overdue'),
                        cancelled: t('status.cancelled'),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="flex flex-col">
              <h3 className="text-xs font-bold uppercase text-default-500">{tl(labels, 'preview.billTo') || 'Bill To:'}</h3>
              <p className="text-base sm:text-lg font-semibold text-foreground">{invoice.customer_name}</p>
              <p className="text-sm text-default-500">{invoice.customer_street}</p>
              <p className="text-sm text-default-500">{invoice.customer_city}</p>
              <p className="text-sm text-default-500">{invoice.customer_country}</p>
            </div>

            {/* Items Table - grid on desktop, stacked cards on mobile */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Desktop table header */}
              <div className="hidden sm:grid grid-cols-12 border-b-2 py-3 border-foreground">
                <div className="col-span-5 text-sm font-bold text-foreground uppercase">{tl(labels, 'fields.item') || 'Item'}</div>
                <div className="col-span-2 text-sm font-bold text-foreground uppercase text-center">{tl(labels, 'fields.quantity') || 'Quantity'}</div>
                <div className="col-span-2 text-sm font-bold text-foreground uppercase text-right">{tl(labels, 'fields.rate') || 'Rate'}</div>
                <div className="col-span-3 text-sm font-bold text-foreground uppercase text-right">{tl(labels, 'fields.amount') || 'Amount'}</div>
              </div>
              {invoice.items.map((item, i) => (
                <div key={i}>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-12">
                    <span className="col-span-5 text-default-600">{item.name}</span>
                    <span className="col-span-2 text-default-600 text-center">{item.quantity}</span>
                    <span className="col-span-2 text-default-600 text-right">{formatWithCurrency(invoice.currency, item.unit_price.toFixed(2))}</span>
                    <span className="col-span-3 text-foreground font-semibold text-right">{formatWithCurrency(invoice.currency, (item.quantity * item.unit_price).toFixed(2))}</span>
                  </div>
                  {/* Mobile card */}
                  <div className="sm:hidden border border-default-200 rounded-lg p-3 flex flex-col gap-1">
                    <div className="font-semibold text-foreground">{item.name}</div>
                    <div className="flex justify-between text-sm text-default-600">
                      <span>{item.quantity} × {formatWithCurrency(invoice.currency, item.unit_price.toFixed(2))}</span>
                      <span className="font-semibold text-foreground">{formatWithCurrency(invoice.currency, (item.quantity * item.unit_price).toFixed(2))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes/Terms & Totals */}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Terms & Notes */}
              <div className="flex flex-col gap-4 sm:gap-8">
                {invoice.notes && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{tl(labels, 'fields.notes') || 'Notes'}</h4>
                    <p className="text-sm text-default-500 whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{tl(labels, 'fields.terms') || 'Terms & Conditions'}</h4>
                    <p className="text-sm text-default-500 whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}
              </div>
              {/* Totals */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex justify-between text-default-600">
                  <span className="font-semibold text-default-600">{tl(labels, 'fields.subtotal') || 'Subtotal'}:</span>
                  <span className="font-semibold text-foreground">{formatWithCurrency(invoice.currency, (invoice.subtotal_amount ?? 0).toFixed(2))}</span>
                </div>
                {invoice.discount_total_amount != null && (
                  <div className="flex justify-between text-default-600">
                    <span className="text-default-600">{tl(labels, 'fields.discount') || 'Discount'} ({invoice.discount_type === 'percent' ? `${invoice.discount_amount}%` : formatWithCurrency(invoice.currency, invoice.discount_amount ?? 0)}):</span>
                    <span className="font-semibold text-foreground">-{formatWithCurrency(invoice.currency, invoice.discount_total_amount.toFixed(2))}</span>
                  </div>
                )}
                {invoice.tax_total_amount != null && (
                  <div className="flex justify-between text-default-600">
                    <span className="text-default-600">{tl(labels, 'fields.tax') || 'Tax'} ({invoice.tax_type === 'percent' ? `${invoice.tax_amount}%` : formatWithCurrency(invoice.currency, invoice.tax_amount ?? 0)}):</span>
                    <span className="font-semibold text-foreground">{formatWithCurrency(invoice.currency, invoice.tax_total_amount.toFixed(2))}</span>
                  </div>
                )}
                {invoice.shipping_total_amount != null && (
                  <div className="flex justify-between text-default-600">
                    <span className="text-default-600">{tl(labels, 'fields.shipping') || 'Shipping'}:</span>
                    <span className="font-semibold text-foreground">{formatWithCurrency(invoice.currency, invoice.shipping_total_amount.toFixed(2))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-default-200">
                  <span className="text-lg sm:text-xl font-bold text-foreground">{tl(labels, 'fields.total') || 'Total'}:</span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground">{formatWithCurrency(invoice.currency, (invoice.total_amount ?? 0).toFixed(2))}</span>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row gap-2">
          <Button className="w-full sm:w-auto" variant="light" onClick={onClose}>
            {t('preview.close')}
          </Button>
          <Button 
            className="w-full sm:w-auto"
            color="primary" 
            onClick={() => onDownload(invoice.id)}
            startContent={<Download className="size-4" />}
          >
            {t('actions.downloadPdf')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
