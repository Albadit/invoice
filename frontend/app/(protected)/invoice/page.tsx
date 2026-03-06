'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi } from '@/features/currencies/api';
import { companiesApi } from '@/features/companies/api';
import type { InvoiceWithItems, Currency, Company } from '@/lib/types';
import { formatCurrencyAmount } from '@/config/formatting';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
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
import { CalendarDate } from "@internationalized/date";
import { useRouter, useSearchParams } from 'next/navigation';
import { EllipsisVertical, Plus, Download, Edit, HandCoins, Copy, Clock, Trash, Ban, Eye, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { dateFormats } from '@/config/formatting';
import { getStatusBadge, handleMarkAsPaid, handleMarkAsPending, handleVoid, handleDuplicate } from '@/features/invoice/utils/invoice-utils';
import { getEffectiveStatus } from '@/config/formatting';
import { InvoicePreviewModal } from '@/features/invoice/components';
import { ConfirmModal, StickyHeader, Pagination } from '@/components/ui';
import { useTranslation } from '@/contexts/LocaleProvider';
import { INVOICE_ROUTES } from '@/config/routes';
import { addToast } from "@heroui/toast";
import { usePermissions } from '@/features/auth/components';

// Format large numbers compactly (e.g., 300100 -> "300.1K")
// Map UI column keys to DB column names (constant, never changes)
const COLUMN_TO_DB_FIELD: Record<string, string> = {
  invoice_code: 'invoice_code',
  customer_name: 'customer_name',
  issue_date: 'issue_date',
  due_date: 'due_date',
  status: 'status',
  total_amount: 'total_amount',
  created_at: 'created_at'
};

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation('invoice');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission } = usePermissions();
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithItems[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmColor: 'primary' | 'danger' | 'success' | 'warning' | 'default' | 'secondary';
    confirmLabel?: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', confirmColor: 'primary', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortDescriptors, setSortDescriptors] = useState<SortDescriptor[]>([
    { column: 'created_at', direction: 'descending' }
  ]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Ref to hold latest filter/sort state (avoids stale closures in pagination handlers)
  const filtersRef = useRef({ currentFilters: null as typeof currentFilters | null, debouncedSearch: '', sortDescriptors: [{ column: 'created_at', direction: 'descending' as const }] as SortDescriptor[], rowsPerPage: rowsPerPage });
  
  const [currentFilters, setCurrentFilters] = useState<{
    searchQuery: string;
    statusFilter: Set<string>;
    companyFilter: Set<string>;
    dateRange: { start: DateValue; end: DateValue } | null;
  }>(() => {
    const statusParam = searchParams.get('status');
    const companyParam = searchParams.get('company');
    const yearParam = searchParams.get('year');

    let dateRange: { start: DateValue; end: DateValue } | null = null;
    if (yearParam) {
      const y = Number(yearParam);
      if (!isNaN(y)) {
        dateRange = {
          start: new CalendarDate(y, 1, 1),
          end: new CalendarDate(y, 12, 31),
        };
      }
    }

    return {
      searchQuery: '',
      statusFilter: statusParam ? new Set(statusParam.split(',')) : new Set<string>(),
      companyFilter: companyParam ? new Set([companyParam]) : new Set<string>(),
      dateRange,
    };
  });
  
  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.searchQuery);
  
  // Track previous filter values to detect actual changes
  const prevFiltersRef = useRef<string>('');

  // Keep filtersRef in sync with latest state
  filtersRef.current = { currentFilters, debouncedSearch, sortDescriptors, rowsPerPage };

  // Load currencies and companies only once on mount
  useEffect(() => {
    loadLookups();
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
      rowsPerPage,
      debouncedSearch,
      statusFilter: Array.from(currentFilters.statusFilter).sort(),
      companyFilter: Array.from(currentFilters.companyFilter).sort(),
      dateRange: currentFilters.dateRange,
      sortDescriptors: sortDescriptors.map(s => `${s.column}:${s.direction}`)
    });
    
    // Only reset if filters actually changed (not just a re-render)
    if (filterKey !== prevFiltersRef.current) {
      prevFiltersRef.current = filterKey;
      setCurrentPage(1);
      loadInvoices(1);
    }
  }, [rowsPerPage, debouncedSearch, currentFilters.statusFilter, currentFilters.companyFilter, currentFilters.dateRange, sortDescriptors]);

  async function loadLookups() {
    try {
      const [currencyData, companyData] = await Promise.all([
        currenciesApi.getAll(),
        companiesApi.getAll()
      ]);
      setCurrencies(currencyData);
      setCompanies(companyData);
    } catch (error) {
      console.error('Failed to load lookups:', error);
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
    link.href = INVOICE_ROUTES.download(invoiceId);
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
    const { currentFilters: filters, debouncedSearch: search, sortDescriptors: sorts, rowsPerPage: limit } = filtersRef.current;
    
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
        search: search || undefined,
        statusFilter: statusArr.length > 0 ? statusArr : undefined,
        companyIds: filters?.companyFilter.size ? Array.from(filters.companyFilter) : undefined,
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
  function handlePageChange(page: number) {
    setCurrentPage(page);
    loadInvoices(page);
  }

  const loadingState = loading && filteredInvoices.length === 0 ? 'loading' : 'idle';

  async function handleDelete(invoiceId: string) {
    try {
      await invoicesApi.delete(invoiceId);
      await loadInvoices(currentPage);
      addToast({
        title: t('messages.deleted'),
        description: t('messages.deletedDescription'),
        color: 'success',
      });
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      addToast({
        title: t('messages.error'),
        description: t('messages.deleteError'),
        color: 'danger',
      });
    }
  }

  function openConfirm(opts: {
    title: string;
    message: string;
    confirmColor: 'primary' | 'danger' | 'success' | 'warning' | 'default' | 'secondary';
    confirmLabel?: string;
    action: () => Promise<void>;
  }) {
    setConfirmModal({ isOpen: true, ...opts });
  }

  async function handleConfirm() {
    if (!confirmModal.action) return;
    setConfirmLoading(true);
    try {
      await confirmModal.action();
    } finally {
      setConfirmLoading(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

  // Only pass sortDescriptor to Table when the primary sort column is visible in the table
  // (created_at is a DB-only column, not rendered as a TableColumn, causing hydration mismatch)
  const VISIBLE_SORT_COLUMNS = new Set(['invoice_code', 'customer_name', 'issue_date', 'due_date', 'status', 'total_amount']);
  const tableSortDescriptor = sortDescriptors[0]?.column && VISIBLE_SORT_COLUMNS.has(sortDescriptors[0].column as string)
    ? sortDescriptors[0]
    : undefined;

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
          <div className="hidden lg:flex flex-col gap-0.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
            <p className="text-xs sm:text-sm text-default-500">{t('subtitle')}</p>
          </div>
          <div className="sm:ml-auto shrink-0">
            {hasPermission('invoices:create') && (
            <Button color="primary" variant="solid" className='w-full lg:w-fit'
              onClick={() => router.push(INVOICE_ROUTES.new)}
              startContent={<Plus className="size-4" />}
            >
              {t('createNew')}
            </Button>
            )}
          </div>
      </StickyHeader>

      <Card>
        <CardBody className='flex flex-col lg:grid grid-cols-2 gap-4'>
          <Input
            className='col-span-1 row-span-1'
            isClearable
            startContent={<Search className="size-4" />}
            placeholder={t('search.placeholder')}
            value={currentFilters.searchQuery}
            onChange={(e) => setCurrentFilters({ ...currentFilters, searchQuery: e.target.value })}
            onClear={() => setCurrentFilters({ ...currentFilters, searchQuery: '' })}
          />
          <Select
            aria-label={t('filter.company')}
            selectionMode="multiple"
            classNames={{
              base: 'col-span-1 row-span-1',
            }}
            placeholder={t('filter.allCompanies')}
            selectedKeys={currentFilters.companyFilter}
            onSelectionChange={(keys) => setCurrentFilters({ ...currentFilters, companyFilter: new Set(Array.from(keys) as string[]) })}
            endContent={currentFilters.companyFilter.size > 0 ? (
              <span
                role="button"
                tabIndex={0}
                className="p-0.5 rounded-full hover:bg-default-200 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setCurrentFilters({ ...currentFilters, companyFilter: new Set<string>() }); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setCurrentFilters({ ...currentFilters, companyFilter: new Set<string>() }); } }}
                aria-label="Clear company filter"
              >
                <X className="size-3.5 text-default-400" />
              </span>
            ) : null}
            renderValue={(items) => (
              <div className="flex gap-1 overflow-hidden">
                {items.map((item) => (
                  <Chip key={item.key} variant="flat" size="sm">{item.textValue}</Chip>
                ))}
              </div>
            )}
          >
            {companies.map((company) => (
              <SelectItem key={company.id} textValue={company.name}>{company.name}</SelectItem>
            ))}
          </Select>
          <Select
            aria-label={t('table.status')}
            selectionMode="multiple"
            classNames={{
              base: 'col-span-1 row-span-2',
            }}
            placeholder={t('status.all')}
            selectedKeys={currentFilters.statusFilter}
            onSelectionChange={(keys) => setCurrentFilters({ ...currentFilters, statusFilter: new Set(Array.from(keys) as string[]) })}
            endContent={currentFilters.statusFilter.size > 0 ? (
              <span
                role="button"
                tabIndex={0}
                className="p-0.5 rounded-full hover:bg-default-200 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setCurrentFilters({ ...currentFilters, statusFilter: new Set<string>() }); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setCurrentFilters({ ...currentFilters, statusFilter: new Set<string>() }); } }}
                aria-label="Clear status filter"
              >
                <X className="size-3.5 text-default-400" />
              </span>
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
            <SelectItem key="pending" textValue={t('status.pending')}>
              <Chip color="warning" variant="flat" size="sm">{t('status.pending')}</Chip>
            </SelectItem>
            <SelectItem key="paid" textValue={t('status.paid')}>
              <Chip color="success" variant="flat" size="sm">{t('status.paid')}</Chip>
            </SelectItem>
            <SelectItem key="overdue" textValue={t('status.overdue')}>
              <Chip color="danger" variant="flat" size="sm">{t('status.overdue')}</Chip>
            </SelectItem>
            <SelectItem key="cancelled" textValue={t('status.cancelled')}>
              <Chip color="default" variant="flat" size="sm">{t('status.cancelled')}</Chip>
            </SelectItem>
          </Select>
          <DateRangePicker
            showMonthAndYearPickers
            aria-label="Date Range Picker"
            className='col-span-1 row-span-2'
            value={currentFilters.dateRange}
            onChange={(value) => setCurrentFilters({ ...currentFilters, dateRange: value })}
            endContent={currentFilters.dateRange ? (
              <span
                role="button"
                tabIndex={0}
                className="p-0.5 rounded-full hover:bg-default-200 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setCurrentFilters({ ...currentFilters, dateRange: null }); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setCurrentFilters({ ...currentFilters, dateRange: null }); } }}
                aria-label="Clear date range"
              >
                <X className="size-3.5 text-default-400" />
              </span>
            ) : null}
          />
        </CardBody>
      </Card>

      <Table aria-label={t('title')} classNames={{ table: loading ? 'opacity-60 transition-opacity' : 'opacity-100 transition-opacity', sortIcon: 'hidden', th: 'whitespace-nowrap', td: 'whitespace-nowrap' }} sortDescriptor={tableSortDescriptor} onSortChange={handleSortChange}>
        <TableHeader>
          <TableColumn key="invoice_code" className="font-semibold" allowsSorting>{t('table.invoice')}{getSortBadge('invoice_code')}</TableColumn>
          <TableColumn key="customer_name" className="font-semibold" allowsSorting>{t('table.customer')}{getSortBadge('customer_name')}</TableColumn>
          <TableColumn key="issue_date" className="font-semibold" allowsSorting>{t('table.date')}{getSortBadge('issue_date')}</TableColumn>
          <TableColumn key="due_date" className="font-semibold" allowsSorting>{t('table.dueDate')}{getSortBadge('due_date')}</TableColumn>
          <TableColumn key="status" className="font-semibold" allowsSorting>{t('table.status')}{getSortBadge('status')}</TableColumn>
          <TableColumn key="total_amount" className="font-semibold text-right" allowsSorting>{t('table.total')}{getSortBadge('total_amount')}</TableColumn>
          <TableColumn key="actions" className="w-25">
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
              <TableCell className="font-medium">{invoice.invoice_code}</TableCell>
              <TableCell>{invoice.customer_name}</TableCell>
              <TableCell>
                {format(new Date(invoice.issue_date || invoice.created_at || ''), dateFormats.table)}
              </TableCell>
              <TableCell>
                {invoice.due_date
                  ? format(new Date(invoice.due_date), dateFormats.table)
                  : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(getEffectiveStatus(invoice.status, invoice.due_date), {
                pending: t('status.pending'),
                paid: t('status.paid'),
                overdue: t('status.overdue'),
                cancelled: t('status.cancelled')
              })}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrencyAmount(currencies, invoice.currency_id, invoice.total_amount?.toFixed(2) || '0.00')}
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
                      {hasPermission('invoices:update') ? (
                      <DropdownItem key="edit"
                        onClick={() => router.push(INVOICE_ROUTES.edit(invoice.id))}
                        startContent={<Edit className="size-4" />}
                      >
                        {tCommon('actions.edit')}
                      </DropdownItem>
                      ) : null}
                      {hasPermission('invoices:update') && invoice.status !== 'paid' ? (
                      <DropdownItem color="success" key="paid" 
                        onClick={() => openConfirm({
                          title: t('confirm.markAsPaidTitle'),
                          message: t('confirm.markAsPaid'),
                          confirmColor: 'success',
                          confirmLabel: t('actions.markAsPaid'),
                          action: async () => {
                            try {
                              await handleMarkAsPaid(invoice.id, refreshCurrentPage);
                              addToast({ title: t('messages.markedAsPaid'), description: t('messages.markedAsPaidDescription'), color: 'success' });
                            } catch (error) {
                              console.error('Failed to mark as paid:', error);
                              addToast({ title: t('messages.error'), description: t('messages.updateError'), color: 'danger' });
                            }
                          },
                        })}
                        className="text-success"
                        startContent={<HandCoins className="size-4" />}
                      >
                        {t('actions.markAsPaid')}
                      </DropdownItem>
                      ) : null}
                      {hasPermission('invoices:update') && invoice.status !== 'pending' ? (
                      <DropdownItem key="pending" 
                        onClick={() => openConfirm({
                          title: t('confirm.markAsPendingTitle'),
                          message: t('confirm.markAsPending'),
                          confirmColor: 'primary',
                          confirmLabel: t('actions.markAsPending'),
                          action: async () => {
                            try {
                              await handleMarkAsPending(invoice.id, refreshCurrentPage);
                              addToast({ title: t('messages.markedAsPending'), description: t('messages.markedAsPendingDescription'), color: 'success' });
                            } catch (error) {
                              console.error('Failed to mark as pending:', error);
                              addToast({ title: t('messages.error'), description: t('messages.updateError'), color: 'danger' });
                            }
                          },
                        })}
                        startContent={<Clock className="size-4" />}
                      >
                        {t('actions.markAsPending')}
                      </DropdownItem>
                      ) : null}
                      {hasPermission('invoices:create') ? (
                      <DropdownItem key="duplicate" 
                        onClick={() => openConfirm({
                          title: t('confirm.duplicateTitle'),
                          message: t('confirm.duplicate'),
                          confirmColor: 'primary',
                          confirmLabel: t('actions.duplicate'),
                          action: async () => {
                            try {
                              await handleDuplicate(invoice.id, router);
                              addToast({ title: t('messages.duplicated'), description: t('messages.duplicatedDescription'), color: 'success' });
                            } catch (error) {
                              console.error('Failed to duplicate invoice:', error);
                              addToast({ title: t('messages.error'), description: t('messages.duplicateError'), color: 'danger' });
                            }
                          },
                        })}
                        startContent={<Copy className="size-4" />}
                      >
                        {t('actions.duplicate')}
                      </DropdownItem>
                      ) : null}
                      {hasPermission('invoices:update') && invoice.status !== 'cancelled' ? (
                      <DropdownItem color="danger" key="cancelled" 
                        onClick={() => openConfirm({
                          title: t('confirm.cancelTitle'),
                          message: t('confirm.cancel'),
                          confirmColor: 'danger',
                          confirmLabel: t('actions.cancel'),
                          action: async () => {
                            try {
                              await handleVoid(invoice.id, refreshCurrentPage);
                              addToast({ title: t('messages.cancelled'), description: t('messages.cancelledDescription'), color: 'success' });
                            } catch (error) {
                              console.error('Failed to void invoice:', error);
                              addToast({ title: t('messages.error'), description: t('messages.voidError'), color: 'danger' });
                            }
                          },
                        })}
                        className="text-danger"
                        startContent={<Ban className="size-4" />}
                      >
                        {t('actions.cancel')}
                      </DropdownItem>
                      ) : null}
                      {hasPermission('invoices:delete') && invoice.status === 'cancelled' ? (
                      <DropdownItem color="danger" key="delete" 
                        onClick={() => openConfirm({
                          title: t('confirm.deleteTitle'),
                          message: t('confirm.delete'),
                          confirmColor: 'danger',
                          confirmLabel: tCommon('actions.delete'),
                          action: () => handleDelete(invoice.id),
                        })}
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


      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={setRowsPerPage}
      />

      <InvoicePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
        onDownload={handleDownloadPDF}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmColor={confirmModal.confirmColor}
        confirmLabel={confirmModal.confirmLabel}
        isLoading={confirmLoading}
      />
    </main>
  );
}
