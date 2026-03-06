import { getUserPermissions } from '@/features/auth/permissions'

interface ViewAuthProps {
  /** The permission key required to render children (e.g. 'invoices:read') */
  permission: string
  /** Content rendered when the user has the permission */
  children: React.ReactNode
  /** Optional fallback rendered when the user lacks the permission */
  fallback?: React.ReactNode
}

/**
 * Server Component that conditionally renders children based on the
 * current user's permissions. Use it to hide UI elements the user
 * is not authorised to see.
 *
 * @example
 * <ViewAuth permission="invoices:delete">
 *   <DeleteButton />
 * </ViewAuth>
 */
export async function ViewAuth({ permission, children, fallback = null }: ViewAuthProps) {
  const permissions = await getUserPermissions()

  if (!permissions.includes(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
