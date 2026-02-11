'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { invoicesApi } from '@/features/invoice/api';
import type { InvoiceWithItems } from '@/lib/types';

export default function InvoiceTestPage() {
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await invoicesApi.getAll();
        const invoices = res.data;
        if (invoices.length > 0) {
          const firstInvoice = invoices[0];
          setInvoice(firstInvoice);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error || 'No invoice data available'}</div>
      </div>
    );
  }

  return (
    <>
      <section className="bg-gray-300 py-8">
        <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto *:p-12">
<div className="w-full h-full bg-white flex flex-col gap-8">
  {/* Header */}
  <div className="flex flex-col gap-4">
    <div className="flex justify-between">
      {invoice.company?.logo_url ? (
        <Image src={invoice.company.logo_url} alt="Logo" width={128} height={64} className="h-16 w-auto mb-4 object-contain" />
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
      <div className="flex flex-col gap-1">
        <div className="flex justify-end gap-3">
          <span className="text-sm font-semibold text-gray-600">Issue Date:</span>
          <span className="text-sm text-gray-900">{invoice.issue_date}</span>
        </div>
        <div className="flex justify-end gap-3">
          <span className="text-sm font-semibold text-gray-600">Due Date:</span>
          <span className="text-sm text-gray-900">{invoice.due_date}</span>
        </div>
      </div>
    </div>
  </div>
  
  <hr className="border-1 border-gray-200"/>

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

  <div className="grid grid-cols-2 gap-8 grow content-end">
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
        <span className="font-semibold text-gray-900">{invoice.currency?.symbol || '$'}{invoice.subtotal_amount?.toFixed(2) || '0.00'}</span>
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
        <span className="text-2xl font-bold text-gray-900">{invoice.currency?.symbol || '$'}{invoice.total_amount?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  </div>
</div>
        </div>
      </section>
    </>
  );
}
