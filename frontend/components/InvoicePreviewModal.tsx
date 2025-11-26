'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Download, X } from 'lucide-react';
import { format } from 'date-fns';
import type { InvoiceWithItems, Company } from '@/lib/types';
import { getStatusBadge } from '@/utils/invoice-utils';

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
  if (!invoice) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent className="w-fit">
        <ModalHeader className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-xl font-semibold">Invoice Preview</h2>
          <Button
            isIconOnly
            variant="light"
            onClick={onClose}
            startContent={<X className="h-5 w-5" />}
          />
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-8 p-12 max-w-[210mm] max-h-[297mm]">
            {/* Invoice Header */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between">
                {invoice.company?.logo_url ? (
                  <img src={invoice.company.logo_url} alt="Logo" className="h-16 mb-4" />
                ) : (
                  <div className="h-16 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm font-bold mb-4">
                    Logo
                  </div>
                )}
                <div className="flex flex-col gap-2 text-right">
                  <h2 className="text-4xl font-bold text-slate-900">INVOICE</h2>
                  <p className="text-2xl text-slate-600 font-semibold">#{invoice.invoice_number}</p>
                </div>
              </div>
              
              {/* Company Info and Invoice Details */}
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{invoice.company?.name || ''}</h1>
                  {invoice.company?.street && <p className="text-sm text-gray-600">{invoice.company.street}</p>}
                  {(invoice.company?.city || invoice.company?.zip_code) && (
                    <p className="text-sm text-gray-600">
                      {invoice.company.city}{invoice.company.zip_code ? `, ${invoice.company.zip_code}` : ''}
                    </p>
                  )}
                  {invoice.company?.country && <p className="text-sm text-gray-600">{invoice.company.country}</p>}
                  {invoice.company?.email && <p className="text-sm text-gray-600">{invoice.company.email}</p>}
                  {invoice.company?.phone && <p className="text-sm text-gray-600">{invoice.company.phone}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase">Invoice Details</h3>
                  <div className="text-slate-700 space-y-1">
                    <div>
                      <span className="font-semibold">Date: </span>
                      {format(new Date(invoice.issue_date || invoice.created_at || ''), 'MMM dd, yyyy')}
                    </div>
                    {invoice.due_date && (
                      <div>
                        <span className="font-semibold">Due Date: </span>
                        {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Status: </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="flex flex-col">
              <h3 className="text-xs font-bold uppercase text-gray-600 mb-2">Bill To:</h3>
              <p className="text-lg font-semibold text-gray-900">{invoice.customer_name}</p>
              <p className="text-sm text-gray-600">{invoice.customer_street}</p>
              <p className="text-sm text-gray-600">{invoice.customer_city}</p>
              <p className="text-sm text-gray-600">{invoice.customer_country}</p>
            </div>

            {/* Items Table */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-12 border-b-2 py-3 border-slate-900">
                <div className="col-span-5 text-sm font-bold text-slate-900 uppercase">Item</div>
                <div className="col-span-2 text-sm font-bold text-slate-900 uppercase text-center">Quantity</div>
                <div className="col-span-2 text-sm font-bold text-slate-900 uppercase text-right">Rate</div>
                <div className="col-span-3 text-sm font-bold text-slate-900 uppercase text-right">Amount</div>
              </div>
              {invoice.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12">
                  <span className="col-span-5 text-slate-700">{item.name}</span>
                  <span className="col-span-2 text-slate-700 text-center">{item.quantity}</span>
                  <span className="col-span-2 text-slate-700 text-right">{invoice.currency?.symbol || '$'}{item.unit_price.toFixed(2)}</span>
                  <span className="col-span-3 text-slate-900 font-semibold text-right">{invoice.currency?.symbol || '$'}{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Terms & Notes */}
              <div className="flex flex-col gap-8">
                {invoice.notes && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Terms & Conditions</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}
              </div>
              {/* Totals */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{invoice.currency?.symbol || '$'}{(invoice.subtotal_amount ?? 0).toFixed(2)}</span>
                </div>
                {invoice.discount_total_amount != null && (
                  <div className="flex justify-between text-slate-700">
                    <span className="text-gray-700">Discount ({invoice.discount_type === 'percent' ? `${invoice.discount_amount}%` : (invoice.currency?.symbol || '$') + invoice.discount_amount}):</span>
                    <span className="font-semibold text-gray-900">-{invoice.currency?.symbol || '$'}{invoice.discount_total_amount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.tax_total_amount != null && (
                  <div className="flex justify-between text-slate-700">
                    <span className="text-gray-700">Tax ({invoice.tax_type === 'percent' ? `${invoice.tax_amount}%` : (invoice.currency?.symbol || '$') + invoice.tax_amount}):</span>
                    <span className="font-semibold text-gray-900">{invoice.currency?.symbol || '$'}{invoice.tax_total_amount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.shipping_total_amount != null && (
                  <div className="flex justify-between text-slate-700">
                    <span className="text-gray-700">Shipping:</span>
                    <span className="font-semibold text-gray-900">{invoice.currency?.symbol || '$'}{invoice.shipping_total_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">{invoice.currency?.symbol || '$'}{(invoice.total_amount ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t px-6 py-4">
          <Button variant="light" onClick={onClose}>
            Close
          </Button>
          <Button 
            color="primary" 
            onClick={() => onDownload(invoice.id)}
            startContent={<Download className="h-4 w-4" />}
          >
            Download PDF
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
