'use client';

import { useState, useEffect, useRef } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi } from '@/features/settings/api';
import type { InvoiceWithItems, Currency } from '@/lib/types';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Form } from "@heroui/form";
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
import { EllipsisVertical, Plus, Download, Edit, HandCoins, Copy, Clock, Trash, Ban, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadge, handleMarkAsPaid, handleMarkAsPending, handleVoid, handleDuplicate } from '@/features/invoice/utils/invoice-utils';
import { InvoicePreviewModal } from '@/features/invoice/components';
import { useTranslation } from '@/contexts/LocaleProvider';

// Format large numbers compactly (e.g., 300100 -> "300.1K")
function formatRecordCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

export default function InvoicesPage() {
  const router = useRouter();
  const { t } = useTranslation('invoice');
  const { t: tCommon } = useTranslation('common');
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithItems[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
  
  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.searchQuery);
  
  // Track previous filter values to detect actual changes
  const prevFiltersRef = useRef<string>('');

  // Load currencies only once on mount
  useEffect(() => {
    loadCurrencies();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(currentFilters.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentFilters.searchQuery]);

  // Load invoices when filters change - reset to page 1
  useEffect(() => {
    // Create a key from current filter values
    const filterKey = JSON.stringify({
      activeTab,
      rowsPerPage,
      debouncedSearch,
      statusFilter: currentFilters.statusFilter,
      dateRange: currentFilters.dateRange
    });
    
    // Only reset if filters actually changed (not just a re-render)
    if (filterKey !== prevFiltersRef.current) {
      prevFiltersRef.current = filterKey;
      setCurrentPage(1);
      setPageInput('1');
      loadInvoices(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, rowsPerPage, debouncedSearch, currentFilters.statusFilter, currentFilters.dateRange]);

  async function loadCurrencies() {
    try {
      const data = await currenciesApi.getAll();
      setCurrencies(data);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  }

  async function handleViewInvoice(invoice: InvoiceWithItems) {
    try {
      const fullInvoice = await invoicesApi.getById(invoice.id);
      setSelectedInvoice(fullInvoice);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      setSelectedInvoice(invoice);
      setIsModalOpen(true);
    }
  }

  function handleDownloadPDF(invoiceId: string) {
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

  /**
   * Load invoices using offset-based pagination
   */
  async function loadInvoices(page: number) {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    setFilteredInvoices([]); // Clear previous data while loading
    
    try {
      // Build date range strings if provided
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (currentFilters.dateRange?.start && currentFilters.dateRange?.end) {
        startDate = `${currentFilters.dateRange.start.year}-${String(currentFilters.dateRange.start.month).padStart(2, '0')}-${String(currentFilters.dateRange.start.day).padStart(2, '0')}`;
        endDate = `${currentFilters.dateRange.end.year}-${String(currentFilters.dateRange.end.month).padStart(2, '0')}-${String(currentFilters.dateRange.end.day).padStart(2, '0')}`;
      }
      
      const offset = (page - 1) * rowsPerPage;
      
      const { data, totalCount: total } = await invoicesApi.getAll({
        limit: rowsPerPage,
        offset,
        status: activeTab === 'deleted' ? 'cancelled' : 'active',
        search: debouncedSearch || undefined,
        statusFilter: currentFilters.statusFilter !== 'all' ? currentFilters.statusFilter : undefined,
        startDate,
        endDate,
        signal: abortController.signal
      });
      
      if (!abortController.signal.aborted) {
        setFilteredInvoices(data);
        setTotalCount(total);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to load invoices:', error);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }
  
  // Navigation functions
  function goToNextPage() {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    setPageInput(String(nextPage));
    loadInvoices(nextPage);
  }
  
  function goToPrevPage() {
    const prevPage = currentPage - 1;
    setCurrentPage(prevPage);
    setPageInput(String(prevPage));
    loadInvoices(prevPage);
  }
  
  function handlePageInputSubmit() {
    const page = parseInt(pageInput);
    
    if (isNaN(page) || page === currentPage || page < 1 || page > totalPages) {
      setPageInput(String(currentPage));
      return;
    }
    
    setCurrentPage(page);
    loadInvoices(page);
  }

  // Total pages
  const totalPages = Math.ceil(totalCount / rowsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  async function handleDelete(invoiceId: string) {
    if (!confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    try {
      await invoicesApi.delete(invoiceId);
      await loadInvoices(currentPage);
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  }

  // Helper to refresh current page
  async function refreshCurrentPage() {
    await loadInvoices(currentPage);
  }

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-5 p-8">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
          <p className="text-default-500">{t('subtitle')}</p>
        </div>
      </section>
      
      <div className="flex flex-row justify-between">
        <Tabs size="lg" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
          <Tab key="active" title={t('tabs.active')}/>
          <Tab key="deleted" title={t('tabs.cancelled')}/>
        </Tabs>
        <Button color="primary" variant="solid"
          onClick={() => router.push('/invoice/new/edit')}
          startContent={<Plus className="mr-2 h-4 w-4" />}
        >
          {t('createNew')}
        </Button>
      </div>

      <Card>
        <CardBody className='flex flex-col md:grid md:grid-cols-4 gap-4'>
          <Input
            className='md:col-span-2'
            startContent={<Search className="size-4" />}
            placeholder={t('search.placeholder')}
            value={currentFilters.searchQuery}
            onChange={(e) => setCurrentFilters({ ...currentFilters, searchQuery: e.target.value })}
          />
          <Select
            aria-label={t('table.status')}
            selectedKeys={[currentFilters.statusFilter]} 
            onSelectionChange={(keys) => setCurrentFilters({ ...currentFilters, statusFilter: Array.from(keys)[0] as string })}
            className='md:col-span-1'
          >
            {activeTab === 'active' ? (
              <>
                <SelectItem key="all">{t('status.all')}</SelectItem>
                <SelectItem key="pending">{t('status.pending')}</SelectItem>
                <SelectItem key="paid">{t('status.paid')}</SelectItem>
              </>
            ) : (
              <>
                <SelectItem key="all">{t('status.all')}</SelectItem>
                <SelectItem key="cancelled">{t('status.cancelled')}</SelectItem>
              </>
            )}
          </Select>
          <DateRangePicker
            showMonthAndYearPickers
            aria-label="Date Range Picker"
            className='md:col-span-1'
            value={currentFilters.dateRange}
            onChange={(value) => setCurrentFilters({ ...currentFilters, dateRange: value })}
          />
        </CardBody>
      </Card>

      <Table aria-label={t('title')}>
        <TableHeader>
          <TableColumn className="font-semibold">{t('table.invoice')}</TableColumn>
          <TableColumn className="font-semibold">{t('table.customer')}</TableColumn>
          <TableColumn className="font-semibold">{t('table.date')}</TableColumn>
          <TableColumn className="font-semibold">{t('table.dueDate')}</TableColumn>
          <TableColumn className="font-semibold">{t('table.status')}</TableColumn>
          <TableColumn className="font-semibold text-right">{t('table.total')}</TableColumn>
          <TableColumn className="w-[100px]">{t('table.action')}</TableColumn>
        </TableHeader>
        <TableBody 
          isLoading={loading}
          loadingContent={<div className="flex justify-center py-12">{t('messages.loadingInvoices')}</div>}
          emptyContent={<div className="text-center py-12">{t('messages.noInvoices')}</div>}
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
              <TableCell>{getStatusBadge(invoice.status, {
                pending: t('status.pending'),
                paid: t('status.paid'),
                overdue: t('status.overdue'),
                cancelled: t('status.cancelled')
              })}</TableCell>
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
                        {t('actions.downloadPdf')}
                      </DropdownItem>
                      <DropdownItem key="edit"
                        onClick={() => router.push(`/invoice/${invoice.id}/edit`)}
                        startContent={<Edit className="h-4 w-4" />}
                      >
                        {tCommon('actions.edit')}
                      </DropdownItem>
                      {invoice.status !== 'paid' ? (
                      <DropdownItem color="success" key="paid" 
                        onClick={() => handleMarkAsPaid(invoice.id, refreshCurrentPage)} 
                        className="text-success"
                        startContent={<HandCoins className="h-4 w-4" />}
                      >
                        {t('actions.markAsPaid')}
                      </DropdownItem>
                      ) : null}
                      {invoice.status !== 'pending' ? (
                      <DropdownItem key="pending" 
                        onClick={() => handleMarkAsPending(invoice.id, refreshCurrentPage)}
                        startContent={<Clock className="h-4 w-4" />}
                      >
                        {t('actions.markAsPending')}
                      </DropdownItem>
                      ) : null}
                      <DropdownItem key="duplicate" 
                        onClick={() => handleDuplicate(invoice.id, router)}
                        startContent={<Copy className="h-4 w-4" />}
                      >
                        {t('actions.duplicate')}
                      </DropdownItem>
                      {invoice.status !== 'cancelled' ? (
                      <DropdownItem color="danger" key="cancelled" 
                        onClick={() => handleVoid(invoice.id, refreshCurrentPage)} 
                        className="text-danger"
                        startContent={<Ban className="h-4 w-4" />}
                      >
                        {t('actions.cancel')}
                      </DropdownItem>
                      ) : null}
                      {invoice.status === 'cancelled' ? (
                      <DropdownItem color="danger" key="delete" 
                        onClick={() => handleDelete(invoice.id)} 
                        className="text-danger"
                        startContent={<Trash className="h-4 w-4" />}
                      >
                        {tCommon('actions.delete')}
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-4 text-sm">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            isDisabled={!hasPrevPage}
            onClick={goToPrevPage}
            aria-label={t('pagination.previous')}
            startContent={<ChevronLeft className="size-6" />}
          />
          <span className="text-default-500">{t('pagination.pageLabel')}</span>
          <Form onSubmit={(e) => { e.preventDefault(); handlePageInputSubmit(); }} className="inline">
            <Input
              type="number"
              className="w-24"
              classNames={{ input: "text-center" }}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              min={1}
              max={totalPages || 1}
              aria-label={t('pagination.pageLabel')}
            />
          </Form>
          {/* Show total pages */}
          <span className="text-default-500">
            {totalPages > 0 
              ? t('pagination.ofPages', { total: totalPages.toLocaleString() })
              : ''}
          </span>
          <Button
            isIconOnly
            isDisabled={!hasNextPage}
            onClick={goToNextPage}
            aria-label={t('pagination.next')}
            startContent={<ChevronRight className="size-6" />}
          />
        </div>

        {/* Rows per page */}
        <Select
          aria-label={t('pagination.rowsPerPage')}
          className="w-32"
          selectedKeys={[String(rowsPerPage)]}
          onSelectionChange={(keys) => {
            const value = Number(Array.from(keys)[0]);
            setRowsPerPage(value);
            // useEffect will handle reloading with page 1
          }}
        >
          <SelectItem key="25" textValue="25 rows">25 {t('pagination.rows')}</SelectItem>
          <SelectItem key="50" textValue="50 rows">50 {t('pagination.rows')}</SelectItem>
          <SelectItem key="100" textValue="100 rows">100 {t('pagination.rows')}</SelectItem>
        </Select>

        {/* Total records */}
        <span className="text-default-400">
          {formatRecordCount(totalCount)} {t('pagination.records')}
        </span>
      </div>

      <InvoicePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
        onDownload={handleDownloadPDF}
      />
    </main>
  );
}
