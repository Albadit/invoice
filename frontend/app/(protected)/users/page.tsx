'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Shield, KeyRound, Search, Plus, Lock, Trash2 } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { usersApi } from '@/features/users/api';
import { AddUserModal, EditUserRoleModal, ResetLinkModal } from '@/features/users/components';
import { ConfirmModal, StickyHeader, Pagination, ActionDropdown, DataTable } from '@/components/ui';
import type { DataTableColumn, BulkAction } from '@/components/ui';
import { ViewAuth, usePermissions } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import type { AdminUser, Role } from '@/lib/types';
import { useSessionState } from '@/lib/hooks/useSessionState';

export default function UsersPage() {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission, isSystemUser, userId } = usePermissions();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useSessionState('users:search', '');

  // Modal state
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLinkOpen, setIsResetLinkOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [generatingToken, setGeneratingToken] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({ isOpen: false, title: '', message: '', action: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [currentPage, setCurrentPage] = useSessionState('users:page', 1);
  const [rowsPerPage, setRowsPerPage] = useSessionState('users:rowsPerPage', 10);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        usersApi.list(),
        usersApi.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load users:', error);
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
    loadData();
  }, [loadData]);

  // Current user's role level (used to filter visible users by hierarchy)
  const currentUserLevel = useMemo(() => {
    const me = users.find(u => u.id === userId);
    return me?.role_level ?? 0;
  }, [users, userId]);

  const filteredUsers = users.filter((u) => {
    // Hide users with a higher privilege (lower level number) than the current user
    // System users always see everyone
    if (!isSystemUser && (u.role_level ?? 0) < currentUserLevel) return false;
    return u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.role_name || '').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const dateCompare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (dateCompare !== 0) return dateCompare;
    return (a.role_level || 0) - (b.role_level || 0);
  });

  // Pagination
  const totalCount = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset to page 1 when search changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [search, rowsPerPage]);

  async function handleCreateUser(data: { email: string; password: string; roleId?: string }) {
    try {
      await usersApi.createUser(data.email, data.password, data.roleId);
      await loadData();
      addToast({
        title: t('messages.success'),
        description: t('messages.userCreated'),
        color: 'success',
      });
    } catch (error) {
      addToast({
        title: tCommon('common.error'),
        description: error instanceof Error ? error.message : t('messages.userCreateError'),
        color: 'danger',
      });
      throw error;
    }
  }

  async function handleUpdateRole(roleId: string) {
    if (!editUser) return;
    try {
      await usersApi.updateRole(editUser.id, roleId);
      await loadData();
      addToast({
        title: t('messages.success'),
        description: t('messages.roleUpdated'),
        color: 'success',
      });
    } catch {
      addToast({
        title: tCommon('common.error'),
        description: t('messages.roleUpdateError'),
        color: 'danger',
      });
      throw new Error();
    }
  }

  async function handleGenerateResetLink(user: AdminUser) {
    setGeneratingToken(user.id);
    try {
      const token = await usersApi.generateResetToken(user.id);
      const link = `${window.location.origin}/reset-password?token=${token}`;
      setResetLink(link);
      setResetEmail(user.email);
      setIsResetLinkOpen(true);
    } catch {
      addToast({
        title: tCommon('common.error'),
        description: t('messages.resetTokenError'),
        color: 'danger',
      });
    } finally {
      setGeneratingToken(null);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const base = date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    const micro = dateStr.match(/\.(\d{6})/)?.[1]?.slice(3) || '000';
    return `${base}.${ms}${micro}`;
  }

  const userColumns: DataTableColumn<AdminUser>[] = useMemo(() => [
    {
      key: 'email',
      label: t('columns.email'),
      allowsSorting: true,
      render: (user) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{user.email}</span>
          {user.is_system && (
            <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>
              {t('system')}
            </Chip>
          )}
        </div>
      ),
    },
    {
      key: 'role_name',
      label: t('columns.role'),
      allowsSorting: true,
      render: (user) => user.role_name ? (
        <Chip size="sm" variant="flat" color="primary">{user.role_name}</Chip>
      ) : (
        <Chip size="sm" variant="flat" color="default">{t('noRole')}</Chip>
      ),
    },
    {
      key: 'created_at',
      label: t('columns.created'),
      allowsSorting: true,
      render: (user) => formatDate(user.created_at),
    },
    {
      key: 'last_sign_in_at',
      label: t('columns.lastSignIn'),
      allowsSorting: true,
      render: (user) => formatDate(user.last_sign_in_at),
    },
    {
      key: 'actions',
      label: t('columns.actions'),
      render: (user) => {
        if (user.is_system || user.id === userId) return null;
        return (
        <ActionDropdown items={[
          {
            key: 'changeRole',
            label: t('changeRole'),
            icon: <Shield className="size-4" />,
            color: 'primary',
            isHidden: !hasPermission('users:update'),
            isDisabled: user.is_system || user.id === userId,
            onClick: () => {
              setEditUser(user);
              setIsEditRoleOpen(true);
            },
          },
          {
            key: 'resetPassword',
            label: t('resetPassword'),
            icon: <KeyRound className="size-4" />,
            color: 'warning',
            isHidden: !hasPermission('users:update'),
            isDisabled: (user.is_system && !isSystemUser) || user.id === userId,
            isLoading: generatingToken === user.id,
            onClick: () => handleGenerateResetLink(user),
          },
          {
            key: 'delete',
            label: tCommon('actions.delete'),
            icon: <Trash2 className="size-4" />,
            color: 'danger',
            className: 'text-danger',
            isHidden: !hasPermission('users:delete'),
            isDisabled: user.is_system || user.id === userId,
            onClick: () => {
              setConfirmModal({
                isOpen: true,
                title: t('deleteUser'),
                message: t('messages.deleteConfirm', { email: user.email }),
                action: async () => {
                  await usersApi.deleteUser(user.id);
                  await loadData();
                  addToast({
                    title: t('messages.success'),
                    description: t('messages.userDeleted'),
                    color: 'success',
                  });
                },
              });
            },
          },
        ]} />
      );
      },
    },
  ], [t, tCommon, hasPermission, isSystemUser, userId, generatingToken]);

  // Disable selection for system users and the current user
  const disabledKeys = useMemo(() =>
    paginatedUsers
      .filter(u => u.is_system || u.id === userId)
      .map(u => u.id),
    [paginatedUsers, userId]
  );

  const bulkActions: BulkAction[] = [
    {
      key: 'delete',
      label: t('deleteUser'),
      icon: <Trash2 className="size-4" />,
      color: 'danger',
      onClick: (selectedKeys) => {
        const ids = Array.from(selectedKeys).filter(id => {
          const user = users.find(u => u.id === id);
          return user && !user.is_system && user.id !== userId;
        });
        if (!ids.length) return;
        setConfirmModal({
          isOpen: true,
          title: t('deleteUser'),
          message: t('bulk.deleteConfirm', { count: ids.length }),
          action: async () => {
            await usersApi.deleteMany(ids);
            await loadData();
            addToast({ title: t('messages.success'), description: t('bulk.deletedDescription', { count: ids.length }), color: 'success' });
          },
        });
      },
    },
  ];

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        <ViewAuth permission="users:create">
          <div className="w-full sm:w-auto sm:ml-auto shrink-0">
            <Button
              className="w-full sm:w-auto"
              color="primary"
              startContent={<Plus className="size-4" />}
              onClick={() => setIsAddUserOpen(true)}
            >
              {t('addUser')}
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

      <DataTable<AdminUser>
        ariaLabel={t('title')}
        columns={userColumns}
        data={paginatedUsers}
        rowKey="id"
        loading={loading}
        emptyContent={t('noData')}
        selectionMode="multiple"
        bulkActions={bulkActions}
        selectedLabel={tCommon('common.selected')}
        disabledKeys={disabledKeys}
      />

      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSave={handleCreateUser}
        roles={roles}
        isSystemUser={isSystemUser}
      />

      {/* Edit Role Modal */}
      <EditUserRoleModal
        isOpen={isEditRoleOpen}
        onClose={() => {
          setIsEditRoleOpen(false);
          setEditUser(null);
        }}
        onSave={handleUpdateRole}
        user={editUser}
        roles={roles}
        isSystemUser={isSystemUser}
      />

      {/* Reset Link Modal */}
      <ResetLinkModal
        isOpen={isResetLinkOpen}
        onClose={() => {
          setIsResetLinkOpen(false);
          setResetLink('');
          setResetEmail('');
        }}
        resetLink={resetLink}
        userEmail={resetEmail}
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
