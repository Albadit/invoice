'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Plus, Edit, Trash, Search } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { permissionsApi } from '@/features/permissions/api';
import { PermissionModal } from '@/features/permissions/components';
import { ConfirmModal, StickyHeader, Pagination, ActionDropdown, DataTable } from '@/components/ui';
import type { DataTableColumn, BulkAction } from '@/components/ui';
import { ViewAuth, usePermissions } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import type { Permission } from '@/lib/types';
import { useSessionState } from '@/lib/hooks/useSessionState';
import { DEFAULT_ROWS_PER_PAGE } from '@/config/constants';

export default function PermissionsPage() {
  const { t } = useTranslation('permissions');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission } = usePermissions();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentPage, setCurrentPage] = useSessionState('permissions:page', 1);
  const [rowsPerPage, setRowsPerPage] = useSessionState('permissions:rowsPerPage', DEFAULT_ROWS_PER_PAGE);
  const [search, setSearch] = useSessionState('permissions:search', '');

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await permissionsApi.getAll();
      setPermissions(data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      addToast({
        title: tCommon('common.error'),
        description: t('messages.loadError'),
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [t, tCommon]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Filter and paginate
  const filtered = permissions.filter((p) =>
    p.key.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );
  const totalCount = filtered.length;
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [rowsPerPage, search]);

  async function handleAdd(data: { key: string; description: string | null; route: string | null }) {
    try {
      await permissionsApi.create(data);
      await loadPermissions();
      addToast({
        title: t('messages.success'),
        description: t('messages.created'),
        color: 'success',
      });
    } catch {
      addToast({
        title: tCommon('common.error'),
        description: t('messages.createError'),
        color: 'danger',
      });
      throw new Error();
    }
  }

  async function handleEdit(data: { key: string; description: string | null; route: string | null }) {
    if (!selectedPermission) return;
    try {
      await permissionsApi.update(selectedPermission.id, data);
      await loadPermissions();
      addToast({
        title: t('messages.success'),
        description: t('messages.updated'),
        color: 'success',
      });
    } catch {
      addToast({
        title: tCommon('common.error'),
        description: t('messages.updateError'),
        color: 'danger',
      });
      throw new Error();
    }
  }

  function handleDelete(permission: Permission) {
    setConfirmModal({
      isOpen: true,
      title: t('deletePermission'),
      message: t('messages.confirmDelete', { key: permission.key }),
      action: async () => {
        try {
          await permissionsApi.delete(permission.id);
          await loadPermissions();
          addToast({
            title: t('messages.success'),
            description: t('messages.deleted'),
            color: 'success',
          });
        } catch {
          addToast({
            title: tCommon('common.error'),
            description: t('messages.deleteError'),
            color: 'danger',
          });
        }
      },
    });
  }

  // Group by category for display
  function getCategory(key: string) {
    return key.split(':')[0];
  }

  function getAction(key: string) {
    return key.split(':')[1] || key;
  }

  const columns: DataTableColumn<Permission>[] = useMemo(() => [
    {
      key: 'key',
      label: t('columns.key'),
      allowsSorting: true,
      render: (perm) => <span className="font-mono text-xs font-medium">{perm.key}</span>,
    },
    {
      key: 'category',
      label: t('columns.category'),
      render: (perm) => (
        <Chip size="sm" variant="flat" color="primary">
          {getCategory(perm.key)}
        </Chip>
      ),
    },
    {
      key: 'action',
      label: t('columns.action'),
      render: (perm) => (
        <Chip size="sm" variant="flat" color="default">
          {getAction(perm.key)}
        </Chip>
      ),
    },
    {
      key: 'description',
      label: t('columns.description'),
      allowsSorting: true,
      render: (perm) => (
        <span className="text-sm text-default-500">{perm.description || '—'}</span>
      ),
    },
    {
      key: 'route',
      label: t('columns.route'),
      render: (perm) => (
        <span className="text-sm text-default-400 font-mono">{perm.route || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: t('columns.actions'),
      render: (perm) => (
        <ActionDropdown items={[
          {
            key: 'edit',
            label: tCommon('actions.edit'),
            icon: <Edit className="size-4" />,
            color: 'primary',
            isHidden: !hasPermission('permissions:update'),
            onClick: () => {
              setSelectedPermission(perm);
              setIsEditOpen(true);
            },
          },
          {
            key: 'delete',
            label: tCommon('actions.delete'),
            icon: <Trash className="size-4" />,
            color: 'danger',
            className: 'text-danger',
            isHidden: !hasPermission('permissions:delete'),
            onClick: () => handleDelete(perm),
          },
        ]} />
      ),
    },
  ], [t, tCommon, hasPermission]);

  const bulkActions: BulkAction[] = [
    {
      key: 'delete',
      label: t('deletePermission'),
      icon: <Trash className="size-4" />,
      color: 'danger',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys);
        if (!ids.length) return;
        setConfirmModal({
          isOpen: true,
          title: t('deletePermission'),
          message: t('bulk.deleteConfirm', { count: ids.length }),
          action: async () => {
            await permissionsApi.deleteMany(ids);
            await loadPermissions();
            addToast({ title: t('messages.success'), description: t('bulk.deletedDescription', { count: ids.length }), color: 'success' });
          },
        });
      },
    },
  ];

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        <ViewAuth permission="permissions:create">
          <div className="w-full sm:w-auto sm:ml-auto shrink-0">
            <Button
              className="w-full sm:w-auto"
              color="primary"
              startContent={<Plus className="size-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              {t('addPermission')}
            </Button>
          </div>
        </ViewAuth>
      </StickyHeader>

      {/* Search */}
      <Card>
        <CardBody>
          <Input
            isClearable
            className="w-full"
            startContent={<Search className="size-4" />}
            placeholder={tCommon('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </CardBody>
      </Card>

      <DataTable<Permission>
        ariaLabel={t('title')}
        columns={columns}
        data={paginated}
        rowKey={(perm) => perm.id}
        loading={loading}
        emptyContent={t('noData')}
        selectionMode="multiple"
        bulkActions={bulkActions}
        selectedLabel={tCommon('common.selected')}
      />

      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Add Permission Modal */}
      <PermissionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAdd}
      />

      {/* Edit Permission Modal */}
      <PermissionModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedPermission(null);
        }}
        onSave={handleEdit}
        permission={selectedPermission}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null })}
        onConfirm={async () => {
          if (!confirmModal.action) return;
          setConfirmLoading(true);
          try {
            await confirmModal.action();
          } finally {
            setConfirmLoading(false);
            setConfirmModal({ isOpen: false, title: '', message: '', action: null });
          }
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmColor="danger"
        isLoading={confirmLoading}
      />
    </main>
  );
}
