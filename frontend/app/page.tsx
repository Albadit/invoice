'use client';

import { useState, useEffect } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi } from '@/features/settings/api';
import type { InvoiceWithItems, Currency } from '@/lib/types';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell
} from "@heroui/table";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/dropdown";
import { Card, CardBody } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { DateRangePicker } from "@heroui/date-picker";
import type { DateValue } from "@internationalized/date";
import { useRouter } from 'next/navigation';
import { EllipsisVertical, Plus, Download, Edit, HandCoins, Copy, Clock, Trash, Ban, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadge, handleMarkAsPaid, handleMarkAsPending, handleVoid, handleDuplicate } from '@/features/invoice/utils/invoice-utils';
import { InvoicePreviewModal } from '@/features/invoice/components';

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithItems[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  // Separate filter states for each tab
  const [activeFilters, setActiveFilters] = useState<{
    searchQuery: string;
    statusFilter: string;
    dateRange: { start: DateValue; end: DateValue } | null;
  }>({
    searchQuery: '',
    statusFilter: 'all',
    dateRange: null
  });
  
  const [deletedFilters, setDeletedFilters] = useState<{
    searchQuery: string;
    statusFilter: string;
    dateRange: { start: DateValue; end: DateValue } | null;
  }>({
    searchQuery: '',
    statusFilter: 'all',
    dateRange: null
  });
  
  // Current filters based on active tab
  const currentFilters = activeTab === 'active' ? activeFilters : deletedFilters;
  const setCurrentFilters = activeTab === 'active' ? setActiveFilters : setDeletedFilters;

  useEffect(() => {
    loadInvoices();
    loadCurrencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, currentFilters.searchQuery, currentFilters.statusFilter, currentFilters.dateRange]);

  async function loadCurrencies() {
    try {
      const data = await currenciesApi.getAll();
      setCurrencies(data);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  }

  async function handleViewInvoice(invoice: InvoiceWithItems) {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }

  function handleDownloadPDF(invoiceId: string) {
    // Create a hidden link and trigger download
    const link = document.createElement('a');
    link.href = `/invoice/${invoiceId}/download`;
    link.download = `invoice-${invoiceId}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getCurrencySymbol(currencyId: string | null): string {
    if (!currencyId) return '$';
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.symbol : '$';
  }

  async function loadInvoices() {
    setLoading(true);
    try {
      const data = await invoicesApi.getAll();
      
      // Filter based on active tab
      if (activeTab === 'deleted') {
        setInvoices(data.filter(inv => inv.status === 'cancelled'));
      } else {
        setInvoices(data.filter(inv => inv.status !== 'cancelled'));
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...invoices];

    if (currentFilters.searchQuery) {
      const query = currentFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          String(inv.id).toLowerCase().includes(query) ||
          inv.customer_name.toLowerCase().includes(query)
      );
    }

    if (currentFilters.statusFilter && currentFilters.statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === currentFilters.statusFilter);
    }

    if (currentFilters.dateRange?.start && currentFilters.dateRange?.end) {
      const startDate = `${currentFilters.dateRange.start.year}-${String(currentFilters.dateRange.start.month).padStart(2, '0')}-${String(currentFilters.dateRange.start.day).padStart(2, '0')}`;
      const endDate = `${currentFilters.dateRange.end.year}-${String(currentFilters.dateRange.end.month).padStart(2, '0')}-${String(currentFilters.dateRange.end.day).padStart(2, '0')}`;
      
      filtered = filtered.filter((inv) => {
        const invoiceDate = inv.issue_date || inv.created_at || '';
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });
    }

    setFilteredInvoices(filtered);
  }

  async function handleDelete(invoiceId: string) {
    if (!confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    try {
      await invoicesApi.delete(invoiceId);
      await loadInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  }

  return (
    <main className="min-h-screen max-w-7xl mx-auto flex flex-col gap-5 p-8">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Invoices</h1>
          <p className="text-default-500">Manage and track all your invoices</p>
        </div>
      </section>
      
      <div className="flex flex-row justify-between">
        <Tabs size="lg" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
          <Tab key="active" title="Active Invoices"/>
          <Tab key="deleted" title="Cancelled Invoices"/>
        </Tabs>
        <Button color="primary" variant="solid"
          onClick={() => router.push('/invoice/new/edit')}
          startContent={<Plus className="mr-2 h-4 w-4" />}
        >
          New Invoice
        </Button>
      </div>

      <Card>
        <CardBody className='flex flex-col md:grid md:grid-cols-4 gap-4'>
          <Input
            className='md:col-span-2'
            startContent={<Search className="h-4 w-4" />}
            placeholder="Search invoices..."
            value={currentFilters.searchQuery}
            onChange={(e) => setCurrentFilters({ ...currentFilters, searchQuery: e.target.value })}
          />
          <Select
            aria-label="Status"
            selectedKeys={[currentFilters.statusFilter]} 
            onSelectionChange={(keys) => setCurrentFilters({ ...currentFilters, statusFilter: Array.from(keys)[0] as string })}
            className='md:col-span-1'
          >
            {activeTab === 'active' ? (
              <>
                <SelectItem key="all">All Statuses</SelectItem>
                <SelectItem key="pending">Pending</SelectItem>
                <SelectItem key="paid">Paid</SelectItem>
              </>
            ) : (
              <>
                <SelectItem key="all">All Statuses</SelectItem>
                <SelectItem key="cancelled">Cancelled</SelectItem>
              </>
            )}
          </Select>
          <DateRangePicker
            aria-label="Date Range Picker"
            className='md:col-span-1'
            value={currentFilters.dateRange}
            onChange={(value) => setCurrentFilters({ ...currentFilters, dateRange: value })}
          />
        </CardBody>
      </Card>

      <Table aria-label="Invoice table" selectionMode="single">
        <TableHeader>
          <TableColumn className="font-semibold">Invoice</TableColumn>
          <TableColumn className="font-semibold">Customer</TableColumn>
          <TableColumn className="font-semibold">Date</TableColumn>
          <TableColumn className="font-semibold">Due Date</TableColumn>
          <TableColumn className="font-semibold">Status</TableColumn>
          <TableColumn className="font-semibold text-right">Total</TableColumn>
          <TableColumn className="w-[100px]">Action</TableColumn>
        </TableHeader>
        <TableBody 
          isLoading={loading}
          loadingContent={<div className="flex justify-center py-12">Loading invoices...</div>}
          emptyContent={<div className="text-center py-12">No invoices found</div>}
        >
          {filteredInvoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>{invoice.customer_name}</TableCell>
              <TableCell>
                {format(new Date(invoice.issue_date || invoice.created_at || ''), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                {invoice.due_date
                  ? format(new Date(invoice.due_date), 'MMM dd, yyyy')
                  : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
              <TableCell className="text-right font-semibold">
                {getCurrencySymbol(invoice.currency_id)}{invoice.total_amount?.toFixed(2) || '0.00'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onClick={() => handleViewInvoice(invoice)}
                    startContent={<Eye className="h-4 w-4" />}
                  />
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <Button variant="light" size="sm" startContent={<EllipsisVertical className="h-4 w-4" />}/>                            
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem key="download"
                        onClick={() => handleDownloadPDF(invoice.id)}
                        startContent={<Download className="h-4 w-4" />}
                      >
                        Download PDF
                      </DropdownItem>
                      <DropdownItem key="edit"
                        onClick={() => router.push(`/invoice/${invoice.id}/edit`)}
                        startContent={<Edit className="h-4 w-4" />}
                      >
                        Edit
                      </DropdownItem>
                      {invoice.status !== 'paid' ? (
                      <DropdownItem color="success" key="paid" 
                        onClick={() => handleMarkAsPaid(invoice.id, loadInvoices)} 
                        className="text-success"
                        startContent={<HandCoins className="h-4 w-4" />}
                      >
                        Mark as Paid
                      </DropdownItem>
                      ) : null}
                      {invoice.status !== 'pending' ? (
                      <DropdownItem key="pending" 
                        onClick={() => handleMarkAsPending(invoice.id, loadInvoices)}
                        startContent={<Clock className="h-4 w-4" />}
                      >
                        Mark as Pending
                      </DropdownItem>
                      ) : null}
                      <DropdownItem key="duplicate" 
                        onClick={() => handleDuplicate(invoice.id, router)}
                        startContent={<Copy className="h-4 w-4" />}
                      >
                        Duplicate
                      </DropdownItem>
                      {invoice.status !== 'cancelled' ? (
                      <DropdownItem color="danger" key="cancelled" 
                        onClick={() => handleVoid(invoice.id, loadInvoices)} 
                        className="text-danger"
                        startContent={<Ban className="h-4 w-4" />}
                      >
                        Cancelled Invoice
                      </DropdownItem>
                      ) : null}
                      {invoice.status === 'cancelled' ? (
                      <DropdownItem color="danger" key="delete" 
                        onClick={() => handleDelete(invoice.id)} 
                        className="text-danger"
                        startContent={<Trash className="h-4 w-4" />}
                      >
                        Delete
                      </DropdownItem>
                      ) : null}
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InvoicePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
        onDownload={handleDownloadPDF}
      />
    </main>
  );
}
