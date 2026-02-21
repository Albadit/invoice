'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi } from '@/features/settings/api';
import type { InvoiceWithItems, Currency } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/utils';
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
import type { SortDescriptor } from "@heroui/table";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/dropdown";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { DateRangePicker } from "@heroui/date-picker";
import type { DateValue } from "@internationalized/date";
import { useRouter } from 'next/navigation';
import { EllipsisVertical, Plus, Download, Edit, HandCoins, Copy, Clock, Trash, Ban, Eye, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadge, handleMarkAsPaid, handleMarkAsPending, handleVoid, handleDuplicate } from '@/features/invoice/utils/invoice-utils';
import { InvoicePreviewModal } from '@/features/invoice/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import { addToast } from "@heroui/toast";

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

// Map UI column keys to DB column names (constant, never changes)
const COLUMN_TO_DB_FIELD: Record<string, string> = {
  invoice_number: 'invoice_number',
  customer_name: 'customer_name',
  issue_date: 'issue_date',
  due_date: 'due_date',
  status: 'status',
  total_amount: 'total_amount',
  created_at: 'created_at'
};

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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortDescriptors, setSortDescriptors] = useState<SortDescriptor[]>([
    { column: 'created_at', direction: 'descending' }
  ]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Ref to hold latest filter/sort state (avoids stale closures in pagination handlers)
  const filtersRef = useRef({ currentFilters: null as typeof activeFilters | null, debouncedSearch: '', sortDescriptors: [{ column: 'created_at', direction: 'descending' as const }] as SortDescriptor[], activeTab: 'active', rowsPerPage: rowsPerPage });
  
  // Separate filter states for each tab
  const [activeFilters, setActiveFilters] = useState<{
    searchQuery: string;
    statusFilter: Set<string>;
    dateRange: { start: DateValue; end: DateValue } | null;
  }>({
    searchQuery: '',
    statusFilter: new Set<string>(),
    dateRange: null
  });
  
  const [deletedFilters, setDeletedFilters] = useState<{
    searchQuery: string;
    statusFilter: Set<string>;
    dateRange: { start: DateValue; end: DateValue } | null;
  }>({
    searchQuery: '',
    statusFilter: new Set<string>(),
    dateRange: null
  });
  
  // Current filters based on active tab
  const currentFilters = activeTab === 'active' ? activeFilters : deletedFilters;
  const setCurrentFilters = activeTab === 'active' ? setActiveFilters : setDeletedFilters;
  
  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.searchQuery);
  
  // Track previous filter values to detect actual changes
  const prevFiltersRef = useRef<string>('');

  // Keep filtersRef in sync with latest state
  filtersRef.current = { currentFilters, debouncedSearch, sortDescriptors, activeTab, rowsPerPage };

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
      statusFilter: Array.from(currentFilters.statusFilter).sort(),
      dateRange: currentFilters.dateRange,
      sortDescriptors: sortDescriptors.map(s => `${s.column}:${s.direction}`)
    });
    
    // Only reset if filters actually changed (not just a re-render)
    if (filterKey !== prevFiltersRef.current) {
      prevFiltersRef.current = filterKey;
      setCurrentPage(1);
      setPageInput('1');
      loadInvoices(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, rowsPerPage, debouncedSearch, currentFilters.statusFilter, currentFilters.dateRange, sortDescriptors]);

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
    
    // Read latest filter state from ref (avoids stale closures)
    const { currentFilters: filters, debouncedSearch: search, sortDescriptors: sorts, activeTab: tab, rowsPerPage: limit } = filtersRef.current;
    
    try {
      // Build date range strings if provided
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (filters?.dateRange?.start && filters?.dateRange?.end) {
        startDate = `${filters.dateRange.start.year}-${String(filters.dateRange.start.month).padStart(2, '0')}-${String(filters.dateRange.start.day).padStart(2, '0')}`;
        endDate = `${filters.dateRange.end.year}-${String(filters.dateRange.end.month).padStart(2, '0')}-${String(filters.dateRange.end.day).padStart(2, '0')}`;
      }
      
      const offset = (page - 1) * limit;
      
      // Build multi-column sort order string for PostgREST
      const orderParts = sorts.map(s => {
        const dbField = COLUMN_TO_DB_FIELD[s.column as string] || 'created_at';
        const dir = s.direction === 'ascending' ? 'asc' : 'desc';
        return `${dbField}.${dir}`;
      });
      if (!sorts.some(s => s.column === 'created_at')) {
        orderParts.push('created_at.desc');
      }
      orderParts.push('id.desc');

      const statusArr = filters ? Array.from(filters.statusFilter) : [];
      const { data, totalCount: total } = await invoicesApi.getAll({
        limit,
        offset,
        status: tab === 'deleted' ? 'cancelled' : 'active',
        search: search || undefined,
        statusFilter: statusArr.length > 0 ? statusArr : undefined,
        startDate,
        endDate,
        orderBy: orderParts.join(','),
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
  const loadingState = loading && filteredInvoices.length === 0 ? 'loading' : 'idle';

  async function handleDelete(invoiceId: string) {
    if (!confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) {
      return;
    }
    
    try {
      await invoicesApi.delete(invoiceId);
      await loadInvoices(currentPage);
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      addToast({
        title: 'Error',
        description: 'Failed to delete invoice. Please try again.',
        color: 'danger',
      });
    }
  }

  // Helper to refresh current page
  const refreshCurrentPage = useCallback(async () => {
    await loadInvoices(currentPage);
  }, [currentPage]);

  // Multi-column sort handler: click to add, click again to toggle direction, click again to remove
  function handleSortChange(descriptor: SortDescriptor) {
    setSortDescriptors(prev => {
      const existingIndex = prev.findIndex(s => s.column === descriptor.column);
      if (existingIndex >= 0) {
        // Already sorted: if ascending → flip to descending, if descending → remove
        if (prev[existingIndex].direction === 'ascending') {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], direction: 'descending' };
          return updated;
        } else {
          // Remove this column from sort
          const updated = prev.filter((_, i) => i !== existingIndex);
          return updated.length > 0 ? updated : [{ column: 'created_at', direction: 'descending' as const }];
        }
      }
      // New column: if only default sort is active, replace it; otherwise append
      const isDefault = prev.length === 1 && prev[0].column === 'created_at' && prev[0].direction === 'descending';
      if (isDefault) {
        return [{ column: descriptor.column, direction: 'ascending' as const }];
      }
      return [...prev, { column: descriptor.column, direction: 'ascending' as const }];
    });
  }

  // Sort badge with arrow direction
  function getSortBadge(columnKey: string) {
    const index = sortDescriptors.findIndex(s => s.column === columnKey);
    if (index < 0) return null;
    const arrow = sortDescriptors[index].direction === 'ascending' ? '↑' : '↓';
    return (
      <span className="inline-flex items-center text-[10px] text-primary font-bold ml-0.5">
        {sortDescriptors.length > 1 ? `${index + 1}` : ''}{arrow}
      </span>
    );
  }

  const isDefaultSort = sortDescriptors.length === 1 && sortDescriptors[0].column === 'created_at' && sortDescriptors[0].direction === 'descending';

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <div className="flex flex-col gap-1 sm:gap-2">
        <h1 className="text-2xl sm:text-4xl font-bold">{t('title')}</h1>
        <p className="text-sm sm:text-base text-default-500">{t('subtitle')}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <Tabs size="lg" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
          <Tab key="active" title={t('tabs.active')}/>
          <Tab key="deleted" title={t('tabs.cancelled')}/>
        </Tabs>
        <Button color="primary" variant="solid" className="w-full sm:w-auto"
          onClick={() => router.push('/invoice/new/edit')}
          startContent={<Plus className="h-4 w-4" />}
        >
          {t('createNew')}
        </Button>
      </div>

      <Card>
        <CardBody className='flex flex-col md:grid md:grid-cols-4 gap-4'>
          <Input
            className='md:col-span-2'
            isClearable
            startContent={<Search className="size-4" />}
            placeholder={t('search.placeholder')}
            value={currentFilters.searchQuery}
            onChange={(e) => setCurrentFilters({ ...currentFilters, searchQuery: e.target.value })}
            onClear={() => setCurrentFilters({ ...currentFilters, searchQuery: '' })}
          />
          <Select
            aria-label={t('table.status')}
            selectionMode="multiple"
            classNames={{
              base: 'md:col-span-1',
            }}
            placeholder={t('status.all')}
            selectedKeys={currentFilters.statusFilter}
            onSelectionChange={(keys) => setCurrentFilters({ ...currentFilters, statusFilter: new Set(Array.from(keys) as string[]) })}
            endContent={currentFilters.statusFilter.size > 0 ? (
              <button
                className="p-0.5 rounded-full hover:bg-default-200 transition-colors"
                onClick={(e) => { e.stopPropagation(); setCurrentFilters({ ...currentFilters, statusFilter: new Set<string>() }); }}
                aria-label="Clear status filter"
              >
                <X className="size-3.5 text-default-400" />
              </button>
            ) : null}
            renderValue={(items) => (
              <div className="flex gap-1 overflow-hidden">
                {items.map((item) => {
                  const color = item.key === 'pending' ? 'warning' : item.key === 'paid' ? 'success' : item.key === 'overdue' ? 'danger' : 'default';
                  return <Chip key={item.key} color={color} variant="flat" size="sm">{item.textValue}</Chip>;
                })}
              </div>
            )}
          >
            {activeTab === 'active' ? (
              [<SelectItem key="pending" textValue={t('status.pending')}>
                <Chip color="warning" variant="flat" size="sm">{t('status.pending')}</Chip>
              </SelectItem>,
              <SelectItem key="paid" textValue={t('status.paid')}>
                <Chip color="success" variant="flat" size="sm">{t('status.paid')}</Chip>
              </SelectItem>,
              <SelectItem key="overdue" textValue={t('status.overdue')}>
                <Chip color="danger" variant="flat" size="sm">{t('status.overdue')}</Chip>
              </SelectItem>]
            ) : (
              [<SelectItem key="cancelled" textValue={t('status.cancelled')}>
                <Chip color="default" variant="flat" size="sm">{t('status.cancelled')}</Chip>
              </SelectItem>]
            )}
          </Select>
          <DateRangePicker
            showMonthAndYearPickers
            aria-label="Date Range Picker"
            className='md:col-span-1'
            value={currentFilters.dateRange}
            onChange={(value) => setCurrentFilters({ ...currentFilters, dateRange: value })}
            endContent={currentFilters.dateRange ? (
              <button
                className="p-0.5 rounded-full hover:bg-default-200 transition-colors"
                onClick={(e) => { e.stopPropagation(); setCurrentFilters({ ...currentFilters, dateRange: null }); }}
                aria-label="Clear date range"
              >
                <X className="size-3.5 text-default-400" />
              </button>
            ) : null}
          />
        </CardBody>
      </Card>

      <Table aria-label={t('title')} classNames={{ table: loading ? 'opacity-60 transition-opacity' : 'opacity-100 transition-opacity', sortIcon: 'hidden', th: 'whitespace-nowrap', td: 'whitespace-nowrap' }} sortDescriptor={sortDescriptors[0]} onSortChange={handleSortChange}>
        <TableHeader>
          <TableColumn key="invoice_number" className="font-semibold" allowsSorting>{t('table.invoice')}{getSortBadge('invoice_number')}</TableColumn>
          <TableColumn key="customer_name" className="font-semibold" allowsSorting>{t('table.customer')}{getSortBadge('customer_name')}</TableColumn>
          <TableColumn key="issue_date" className="font-semibold" allowsSorting>{t('table.date')}{getSortBadge('issue_date')}</TableColumn>
          <TableColumn key="due_date" className="font-semibold" allowsSorting>{t('table.dueDate')}{getSortBadge('due_date')}</TableColumn>
          <TableColumn key="status" className="font-semibold" allowsSorting>{t('table.status')}{getSortBadge('status')}</TableColumn>
          <TableColumn key="total_amount" className="font-semibold text-right" allowsSorting>{t('table.total')}{getSortBadge('total_amount')}</TableColumn>
          <TableColumn key="actions" className="w-[100px]">
            <div className="flex items-center gap-1">
              {t('table.action')}
              {!isDefaultSort ? (
                <button
                  className="p-0.5 rounded-full hover:bg-default-200 transition-colors"
                  onClick={() => setSortDescriptors([{ column: 'created_at', direction: 'descending' }])}
                  aria-label="Reset sort"
                >
                  <X className="size-3.5 text-default-400" />
                </button>
              ) : null}
            </div>
          </TableColumn>
        </TableHeader>
        <TableBody 
          isLoading={loadingState === 'loading'}
          loadingContent={<div className="flex justify-center py-12">{t('messages.loadingInvoices')}</div>}
          emptyContent={<div className="text-center py-12">{loading ? t('messages.loadingInvoices') : t('messages.noInvoices')}</div>}
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
                {getCurrencySymbol(currencies, invoice.currency_id)}{invoice.total_amount?.toFixed(2) || '0.00'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onClick={() => handleViewInvoice(invoice)}
                    startContent={<Eye className="size-4" />}
                  />
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <Button variant="light" size="sm" startContent={<EllipsisVertical className="size-4" />}/>                            
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem key="download"
                        onClick={() => handleDownloadPDF(invoice.id)}
                        startContent={<Download className="size-4" />}
                      >
                        {t('actions.downloadPdf')}
                      </DropdownItem>
                      <DropdownItem key="edit"
                        onClick={() => router.push(`/invoice/${invoice.id}/edit`)}
                        startContent={<Edit className="size-4" />}
                      >
                        {tCommon('actions.edit')}
                      </DropdownItem>
                      {invoice.status !== 'paid' ? (
                      <DropdownItem color="success" key="paid" 
                        onClick={() => handleMarkAsPaid(invoice.id, refreshCurrentPage)} 
                        className="text-success"
                        startContent={<HandCoins className="size-4" />}
                      >
                        {t('actions.markAsPaid')}
                      </DropdownItem>
                      ) : null}
                      {invoice.status !== 'pending' ? (
                      <DropdownItem key="pending" 
                        onClick={() => handleMarkAsPending(invoice.id, refreshCurrentPage)}
                        startContent={<Clock className="size-4" />}
                      >
                        {t('actions.markAsPending')}
                      </DropdownItem>
                      ) : null}
                      <DropdownItem key="duplicate" 
                        onClick={() => handleDuplicate(invoice.id, router)}
                        startContent={<Copy className="size-4" />}
                      >
                        {t('actions.duplicate')}
                      </DropdownItem>
                      {invoice.status !== 'cancelled' ? (
                      <DropdownItem color="danger" key="cancelled" 
                        onClick={() => handleVoid(invoice.id, refreshCurrentPage)} 
                        className="text-danger"
                        startContent={<Ban className="size-4" />}
                      >
                        {t('actions.cancel')}
                      </DropdownItem>
                      ) : null}
                      {invoice.status === 'cancelled' ? (
                      <DropdownItem color="danger" key="delete" 
                        onClick={() => handleDelete(invoice.id)} 
                        className="text-danger"
                        startContent={<Trash className="size-4" />}
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
      <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-3 sm:gap-4 text-sm">
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
              className="w-18"
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
          className="w-full sm:w-32"
          selectedKeys={[String(rowsPerPage)]}
          onSelectionChange={(keys) => {
            const value = Number(Array.from(keys)[0]);
            setRowsPerPage(value);
            // useEffect will handle reloading with page 1
          }}
        >
          <SelectItem key="10" textValue="10 rows">10 {t('pagination.rows')}</SelectItem>
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
