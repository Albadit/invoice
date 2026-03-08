'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Plus, Edit, Trash, Lock, ShieldCheck, Search } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { rolesApi } from '@/features/roles/api';
import {
  AddRoleModal,
  EditRoleModal,
  EditRolePermissionsModal,
} from '@/features/roles/components';
import { ConfirmModal, StickyHeader, Pagination, ActionDropdown, DnDTable } from '@/components/ui';
import type { DnDTableColumn } from '@/components/ui';
import { ViewAuth, usePermissions } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import type { Role } from '@/lib/types';
import { useSessionState } from '@/lib/hooks/useSessionState';
import { DEFAULT_ROWS_PER_PAGE } from '@/config/constants';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export default function RolesPage() {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission } = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useSessionState('roles:search', '');

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentPage, setCurrentPage] = useSessionState('roles:page', 1);
  const [rowsPerPage, setRowsPerPage] = useSessionState('roles:rowsPerPage', DEFAULT_ROWS_PER_PAGE);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolesApi.getAll();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
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
    loadRoles();
  }, [loadRoles]);

  // Filter & Pagination
  const sortedRoles = [...roles].sort((a, b) => a.level - b.level).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );
  const totalCount = sortedRoles.length;
  const paginatedRoles = sortedRoles.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedRoles.findIndex((r) => r.id === active.id);
    const newIndex = sortedRoles.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Prevent dropping above system roles
    const systemCount = sortedRoles.filter((r) => r.is_system).length;
    if (newIndex < systemCount) return;

    const reordered = arrayMove(sortedRoles, oldIndex, newIndex);
    const updates = reordered.map((role, i) => ({ id: role.id, level: i + 1 }));

    // Optimistic update
    setRoles(reordered.map((role, i) => ({ ...role, level: i + 1 })));

    try {
      await rolesApi.updateLevels(updates);
      addToast({
        title: t('messages.success'),
        description: t('messages.levelUpdated'),
        color: 'success',
      });
    } catch {
      await loadRoles();
      addToast({
        title: tCommon('common.error'),
        description: t('messages.levelUpdateError'),
        color: 'danger',
      });
    }
  }

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [search, rowsPerPage]);

  const roleColumns: DnDTableColumn<Role>[] = useMemo(() => [
    {
      key: 'name',
      label: t('columns.name'),
      allowsSorting: true,
      render: (role) => <span className="font-medium">{role.name}</span>,
    },
    {
      key: 'description',
      label: t('columns.description'),
      allowsSorting: true,
      render: (role) => (
        <span className="text-sm text-default-500">{role.description || '—'}</span>
      ),
    },
    {
      key: 'type',
      label: t('columns.type'),
      render: (role) => role.is_system ? (
        <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>
          {t('system')}
        </Chip>
      ) : (
        <Chip size="sm" variant="flat" color="default">{t('custom')}</Chip>
      ),
    },
    {
      key: 'actions',
      label: t('columns.actions'),
      render: (role) => (
        <ActionDropdown items={[
          {
            key: 'permissions',
            label: t('permissions'),
            icon: <ShieldCheck className="size-4" />,
            color: 'primary',
            isHidden: !hasPermission('roles:update'),
            onClick: () => {
              setSelectedRole(role);
              setIsPermissionsOpen(true);
            },
          },
          {
            key: 'edit',
            label: tCommon('actions.edit'),
            icon: <Edit className="size-4" />,
            color: 'primary',
            isHidden: !hasPermission('roles:update') || role.is_system,
            onClick: () => {
              setSelectedRole(role);
              setIsEditOpen(true);
            },
          },
          {
            key: 'delete',
            label: tCommon('actions.delete'),
            icon: <Trash className="size-4" />,
            color: 'danger',
            className: 'text-danger',
            isHidden: !hasPermission('roles:delete') || role.is_system,
            onClick: () => handleDeleteRole(role),
          },
        ]} />
      ),
    },
  ], [t, tCommon, hasPermission]);

  async function handleAddRole(data: { name: string; description: string }) {
    try {
      await rolesApi.create(data);
      await loadRoles();
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

  async function handleEditRole(data: { name: string; description: string }) {
    if (!selectedRole) return;
    try {
      await rolesApi.update(selectedRole.id, data);
      await loadRoles();
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

  function handleDeleteRole(role: Role) {
    setConfirmModal({
      isOpen: true,
      title: t('deleteRole'),
      message: t('messages.confirmDelete', { name: role.name }),
      action: async () => {
        try {
          await rolesApi.delete(role.id);
          await loadRoles();
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

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        <ViewAuth permission="roles:create">
          <div className="w-full sm:w-auto sm:ml-auto shrink-0">
            <Button
              className="w-full sm:w-auto"
              color="primary"
              startContent={<Plus className="size-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              {t('addRole')}
            </Button>
          </div>
        </ViewAuth>
      </StickyHeader>

      <Card>
        <CardBody>
          <Input
            isClearable
            startContent={<Search className="size-4" />}
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </CardBody>
      </Card>

      <DnDTable<Role>
        columns={roleColumns}
        data={paginatedRoles}
        rowKey="id"
        loading={loading}
        emptyContent={t('noData')}
        onDragEnd={handleDragEnd}
        canDrag={(role) => !role.is_system && hasPermission('roles:update')}
      />

      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Add Role Modal */}
      <AddRoleModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddRole}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedRole(null);
        }}
        onSave={handleEditRole}
        role={selectedRole}
      />

      {/* Edit Role Permissions Modal */}
      <EditRolePermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => {
          setIsPermissionsOpen(false);
          setSelectedRole(null);
        }}
        onSave={loadRoles}
        role={selectedRole}
        readOnly={selectedRole?.is_system}
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
