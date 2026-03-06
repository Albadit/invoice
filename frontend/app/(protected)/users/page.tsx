'use client';

import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Shield, KeyRound, Search, Plus, Lock, Trash2 } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { usersApi } from '@/features/users/api';
import { AddUserModal, EditUserRoleModal, ResetLinkModal } from '@/features/users/components';
import { ConfirmModal, StickyHeader, Pagination, ActionDropdown } from '@/components/ui';
import { ViewAuth, usePermissions } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import type { AdminUser, Role } from '@/lib/types';

export default function UsersPage() {
  const { t } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission, isSystemUser, userId } = usePermissions();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
  }

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role_name || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
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
  useEffect(() => {
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

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-4 sm:p-8">
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        <div className="hidden lg:flex flex-col gap-0.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
          <p className="text-xs sm:text-sm text-default-500">{t('subtitle')}</p>
        </div>
        <ViewAuth permission="users:create">
          <div className="sm:ml-auto shrink-0">
            <Button
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

      <Table aria-label={t('title')} classNames={{ table: loading ? 'opacity-60 transition-opacity' : 'opacity-100 transition-opacity', th: 'whitespace-nowrap', td: 'whitespace-nowrap' }}>
        <TableHeader>
            <TableColumn>{t('columns.email')}</TableColumn>
            <TableColumn>{t('columns.role')}</TableColumn>
            <TableColumn>{t('columns.created')}</TableColumn>
            <TableColumn>{t('columns.lastSignIn')}</TableColumn>
            <TableColumn>{t('columns.actions')}</TableColumn>
          </TableHeader>
          <TableBody emptyContent={t('noData')}>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.email}</span>
                    {user.is_system && (
                      <Chip size="sm" variant="flat" color="secondary" startContent={<Lock className="size-3" />}>
                        {t('system')}
                      </Chip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.role_name ? (
                    <Chip size="sm" variant="flat" color="primary">
                      {user.role_name}
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="flat" color="default">
                      {t('noRole')}
                    </Chip>
                  )}
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
