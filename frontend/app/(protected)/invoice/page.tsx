'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { currenciesApi } from '@/features/currencies/api';
import { companiesApi } from '@/features/companies/api';
import { clientsApi } from '@/features/clients/api';
import type { InvoiceWithItems, Currency, Company, Client } from '@/lib/types';
import { formatCurrencyAmount } from '@/config/formatting';
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
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
import type { SortDescriptor } from "@heroui/table";
import type { DateValue } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";
import { useRouter, useSearchParams } from 'next/navigation';
import { EllipsisVertical, Plus, Download, Edit, HandCoins, Copy, Clock, Trash, Ban, Eye, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { dateFormats } from '@/config/formatting';
import { handleMarkAsPaid, handleMarkAsPending, handleVoid, handleDuplicate } from '@/features/invoice/utils/invoice-utils';
import { getEffectiveStatus } from '@/config/formatting';
import { InvoicePreviewModal, StatusBadge } from '@/features/invoice/components';
import { ConfirmModal, StickyHeader, Pagination, DataTable } from '@/components/ui';
import type { DataTableColumn, BulkAction } from '@/components/ui';
import { useTranslation } from '@/contexts/LocaleProvider';
import { INVOICE_ROUTES } from '@/config/routes';
import { addToast } from "@heroui/toast";
import { usePermissions } from '@/features/auth/components';
import { useSessionState } from '@/lib/hooks/useSessionState';
import { DEFAULT_ROWS_PER_PAGE } from '@/config/constants';

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
  const hasUrlParams = searchParams.has('status') || searchParams.has('company') || searchParams.has('year');
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithItems[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
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
  const [currentPage, setCurrentPage] = useSessionState('invoices:page', 1, { skipRestore: hasUrlParams });
  const [rowsPerPage, setRowsPerPage] = useSessionState('invoices:rowsPerPage', DEFAULT_ROWS_PER_PAGE);
  const [totalCount, setTotalCount] = useState(0);
  const [sortDescriptors, setSortDescriptors] = useSessionState<SortDescriptor[]>('invoices:sort', [
    { column: 'created_at', direction: 'descending' }
  ]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Ref to hold latest filter/sort state (avoids stale closures in pagination handlers)
  const filtersRef = useRef({ currentFilters: null as typeof currentFilters | null, debouncedSearch: '', sortDescriptors: [{ column: 'created_at', direction: 'descending' as const }] as SortDescriptor[], rowsPerPage: rowsPerPage });
  
  const [currentFilters, setCurrentFilters] = useSessionState<{
    searchQuery: string;
    statusFilter: Set<string>;
    companyFilter: Set<string>;
    clientFilter: Set<string>;
    dateRange: { start: DateValue; end: DateValue } | null;
  }>('invoices:filters', () => {
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
      clientFilter: new Set<string>(),
      dateRange,
    };
  }, { skipRestore: hasUrlParams });
  
  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.searchQuery);

  // Ensure clientFilter exists (handles restored session state from before this field was added)
  if (!currentFilters.clientFilter) {
    currentFilters.clientFilter = new Set<string>();
  }
  
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
      clientFilter: Array.from(currentFilters.clientFilter).sort(),
      dateRange: currentFilters.dateRange,
      sortDescriptors: sortDescriptors.map(s => `${s.column}:${s.direction}`)
    });
    
    // Only reset if filters actually changed (not just a re-render)
    if (filterKey !== prevFiltersRef.current) {
      prevFiltersRef.current = filterKey;
      setCurrentPage(1);
      loadInvoices(1);
    }
  }, [rowsPerPage, debouncedSearch, currentFilters.statusFilter, currentFilters.companyFilter, currentFilters.clientFilter, currentFilters.dateRange, sortDescriptors]);

  async function loadLookups() {
    try {
      const [currencyData, companyData, clientData] = await Promise.all([
        currenciesApi.getAll(),
        companiesApi.getAll(),
        clientsApi.list()
      ]);
      setCurrencies(currencyData);
      setCompanies(companyData);
      setClients(clientData);
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
        clientIds: filters?.clientFilter.size ? Array.from(filters.clientFilter) : undefined,
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

  // ── Bulk actions ──
  const bulkActions: BulkAction[] = [
    {
      key: 'download',
      label: t('actions.downloadPdf'),
      icon: <Download className="size-4" />,
      color: 'primary',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys);
        openConfirm({
          title: t('actions.downloadPdf'),
          message: t('bulk.downloadConfirm', { count: ids.length }),
          confirmColor: 'primary',
          action: async () => {
            for (let i = 0; i < ids.length; i++) {
              if (i > 0) await new Promise(r => setTimeout(r, 500));
              handleDownloadPDF(ids[i]);
            }
            addToast({ title: t('actions.downloadPdf'), description: t('bulk.downloadedDescription', { count: ids.length }), color: 'success' });
          },
        });
      },
    },
    {
      key: 'markAsPaid',
      label: t('confirm.markAsPaidTitle'),
      icon: <HandCoins className="size-4" />,
      color: 'success',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys);
        openConfirm({
          title: t('confirm.markAsPaidTitle'),
          message: t('bulk.markAsPaidConfirm', { count: ids.length }),
          confirmColor: 'success',
          action: async () => {
            await invoicesApi.updateStatusMany(ids, 'paid');
            addToast({ title: t('messages.markedAsPaid'), description: t('bulk.markedAsPaidDescription', { count: ids.length }), color: 'success' });
            await refreshCurrentPage();
          },
        });
      },
    },
    {
      key: 'markAsPending',
      label: t('confirm.markAsPendingTitle'),
      icon: <Clock className="size-4" />,
      color: 'warning',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys);
        openConfirm({
          title: t('confirm.markAsPendingTitle'),
          message: t('bulk.markAsPendingConfirm', { count: ids.length }),
          confirmColor: 'warning',
          action: async () => {
            await invoicesApi.updateStatusMany(ids, 'pending');
            addToast({ title: t('messages.markedAsPending'), description: t('bulk.markedAsPendingDescription', { count: ids.length }), color: 'success' });
            await refreshCurrentPage();
          },
        });
      },
    },
    {
      key: 'cancel',
      label: t('confirm.cancelTitle'),
      icon: <Ban className="size-4" />,
      color: 'default',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys);
        openConfirm({
          title: t('confirm.cancelTitle'),
          message: t('bulk.cancelConfirm', { count: ids.length }),
          confirmColor: 'warning',
          action: async () => {
            await invoicesApi.updateStatusMany(ids, 'cancelled');
            addToast({ title: t('messages.cancelled'), description: t('bulk.cancelledDescription', { count: ids.length }), color: 'success' });
            await refreshCurrentPage();
          },
        });
      },
    },
    {
      key: 'delete',
      label: t('confirm.deleteTitle'),
      icon: <Trash className="size-4" />,
      color: 'danger',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys);
        openConfirm({
          title: t('confirm.deleteTitle'),
          message: t('bulk.deleteConfirm', { count: ids.length }),
          confirmColor: 'danger',
          action: async () => {
            await invoicesApi.deleteMany(ids);
            addToast({ title: t('messages.deleted'), description: t('bulk.deletedDescription', { count: ids.length }), color: 'success' });
            await refreshCurrentPage();
          },
        });
      },
    },
  ];

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

  const isDefaultSort = sortDescriptors.length === 1 && sortDescriptors[0].column === 'created_at' && sortDescriptors[0].direction === 'descending';

  const VISIBLE_SORT_COLUMNS = new Set(['invoice_code', 'customer_name', 'issue_date', 'due_date', 'status', 'total_amount']);

  const invoiceColumns: DataTableColumn<InvoiceWithItems>[] = [
    {
      key: 'invoice_code',
      label: t('table.invoice'),
      allowsSorting: true,
      render: (inv) => <span className="font-medium">{inv.invoice_code}</span>,
    },
    {
      key: 'customer_name',
      label: t('table.customer'),
      allowsSorting: true,
    },
    {
      key: 'issue_date',
      label: t('table.date'),
      allowsSorting: true,
      render: (inv) => format(new Date(inv.issue_date || inv.created_at || ''), dateFormats.table),
    },
    {
      key: 'due_date',
      label: t('table.dueDate'),
      allowsSorting: true,
      render: (inv) => inv.due_date ? format(new Date(inv.due_date), dateFormats.table) : '-',
    },
    {
      key: 'status',
      label: t('table.status'),
      allowsSorting: true,
      render: (inv) => (
        <StatusBadge
          status={getEffectiveStatus(inv.status, inv.due_date)}
          labels={{
            pending: t('status.pending'),
            paid: t('status.paid'),
            overdue: t('status.overdue'),
            cancelled: t('status.cancelled'),
          }}
        />
      ),
    },
    {
      key: 'total_amount',
      label: t('table.total'),
      allowsSorting: true,
      className: 'font-semibold text-right',
      render: (inv) => (
        <span className="text-right font-semibold">
          {formatCurrencyAmount(currencies, inv.currency_id, inv.total_amount?.toFixed(2) || '0.00')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('table.action'),
      className: 'w-25',
      render: (invoice) => (
        <div className="flex items-center gap-2">
          <Button
            color="primary"
            variant="light"
            size="sm"
            onClick={() => handleViewInvoice(invoice)}
            isIconOnly
            startContent={<Eye className="size-4" />}
          />
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="light" size="sm" isIconOnly startContent={<EllipsisVertical className="size-4" />} />
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
      ),
    },
  ];

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
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
        <CardBody className='flex flex-col gap-4'>
          <Input
            isClearable
            startContent={<Search className="size-4" />}
            placeholder={t('search.placeholder')}
            value={currentFilters.searchQuery}
            onChange={(e) => setCurrentFilters({ ...currentFilters, searchQuery: e.target.value })}
            onClear={() => setCurrentFilters({ ...currentFilters, searchQuery: '' })}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Select
              aria-label={t('filter.company')}
              selectionMode="multiple"
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
              aria-label={t('filter.client')}
              selectionMode="multiple"
              placeholder={t('filter.allClients')}
              selectedKeys={currentFilters.clientFilter}
              onSelectionChange={(keys) => setCurrentFilters({ ...currentFilters, clientFilter: new Set(Array.from(keys) as string[]) })}
              endContent={currentFilters.clientFilter.size > 0 ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="p-0.5 rounded-full hover:bg-default-200 transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setCurrentFilters({ ...currentFilters, clientFilter: new Set<string>() }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setCurrentFilters({ ...currentFilters, clientFilter: new Set<string>() }); } }}
                  aria-label="Clear client filter"
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
              {clients.map((client) => (
                <SelectItem key={client.id} textValue={client.name}>{client.name}</SelectItem>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Select
              aria-label={t('table.status')}
              selectionMode="multiple"
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
          </div>
        </CardBody>
      </Card>

      <DataTable<InvoiceWithItems>
        ariaLabel={t('title')}
        columns={invoiceColumns}
        data={filteredInvoices}
        rowKey="id"
        selectionMode="multiple"
        bulkActions={bulkActions}
        selectedLabel={tCommon('common.selected')}
        onSortChange={handleSortChange}
        sortDescriptors={sortDescriptors}
        visibleSortColumns={VISIBLE_SORT_COLUMNS}
        isDefaultSort={isDefaultSort}
        onSortReset={() => setSortDescriptors([{ column: 'created_at', direction: 'descending' }])}
        loading={loadingState === 'loading'}
        loadingContent={<div className="flex justify-center py-12">{t('messages.loadingInvoices')}</div>}
        emptyContent={<div className="text-center py-12">{loading ? t('messages.loadingInvoices') : t('messages.noInvoices')}</div>}
        classNames={{ table: loading ? 'opacity-60 transition-opacity' : 'opacity-100 transition-opacity' }}
      />


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
