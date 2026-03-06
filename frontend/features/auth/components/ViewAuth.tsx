'use client';

import { usePermissions } from '@/contexts/PermissionsProvider';
import type { ReactNode } from 'react';

interface ViewAuthProps {
  /** The permission key required to render children (e.g. 'invoices:read') */
  permission: string;
  /** Content rendered when the user has the permission */
  children: ReactNode;
  /** Optional fallback rendered when the user lacks the permission */
  fallback?: ReactNode;
}

/**
 * Client Component that conditionally renders children based on the
 * current user's permissions. Reads from PermissionsProvider context
 * which fetches fresh permissions on every navigation.
 *
 * @example
 * <ViewAuth permission="invoices:delete">
 *   <DeleteButton />
 * </ViewAuth>
 */
export function ViewAuth({ permission, children, fallback = null }: ViewAuthProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
