'use client';

import { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Plus, Edit, Trash, Lock, ShieldCheck } from 'lucide-react';
import { addToast } from "@heroui/toast";
import { rolesApi } from '@/features/roles/api';
import {
  AddRoleModal,
  EditRoleModal,
  EditRolePermissionsModal,
} from '@/features/roles/components';
import { ConfirmModal, StickyHeader } from '@/components/ui';
import { ViewAuth, usePermissions } from '@/features/auth/components';
import { useTranslation } from '@/contexts/LocaleProvider';
import type { Role } from '@/lib/types';

export default function RolesPage() {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const { hasPermission } = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
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
  }

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
        <div className="hidden lg:flex flex-col gap-0.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
          <p className="text-xs sm:text-sm text-default-500">{t('subtitle')}</p>
        </div>
        <ViewAuth permission="roles:create">
          <div className="sm:ml-auto shrink-0">
            <Button
              color="primary"
              startContent={<Plus className="size-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              {t('addRole')}
            </Button>
          </div>
        </ViewAuth>
      </StickyHeader>

      <Table aria-label={t('title')} classNames={{ table: loading ? 'opacity-60 transition-opacity' : 'opacity-100 transition-opacity', th: 'whitespace-nowrap', td: 'whitespace-nowrap' }}>
        <TableHeader>
            <TableColumn>{t('columns.name')}</TableColumn>
            <TableColumn>{t('columns.description')}</TableColumn>
            <TableColumn>{t('columns.type')}</TableColumn>
            <TableColumn>{t('columns.actions')}</TableColumn>
          </TableHeader>
          <TableBody emptyContent={t('noData')}>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <span className="font-medium">{role.name}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-default-500">
                    {role.description || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  {role.is_system ? (
                    <Chip
                      size="sm"
                      variant="flat"
                      color="secondary"
                      startContent={<Lock className="size-3" />}
                    >
                      {t('system')}
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="flat" color="default">
                      {t('custom')}
                    </Chip>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <ViewAuth permission="roles:update">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<ShieldCheck className="size-4" />}
                        onClick={() => {
                          setSelectedRole(role);
                          setIsPermissionsOpen(true);
                        }}
                        isDisabled={role.is_system}
                      >
                        {t('permissions')}
                      </Button>
                    </ViewAuth>
                    {!role.is_system && (
                      <>
                        <ViewAuth permission="roles:update">
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            startContent={<Edit className="size-4" />}
                            onClick={() => {
                              setSelectedRole(role);
                              setIsEditOpen(true);
                            }}
                          >
                            {tCommon('actions.edit')}
                          </Button>
                        </ViewAuth>
                        <ViewAuth permission="roles:delete">
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            startContent={<Trash className="size-4" />}
                            onClick={() => handleDeleteRole(role)}
                          >
                            {tCommon('actions.delete')}
                          </Button>
                        </ViewAuth>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
