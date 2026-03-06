import { createClient } from '@/lib/supabase/server'

/**
 * Fetches all permission keys for the current authenticated user.
 * Joins user_roles → role_permissions → permissions to resolve the flat list.
 * Returns an empty array if the user is not authenticated or has no roles.
 */
export async function getUserPermissions(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('user_roles')
    .select('role:roles!inner(role_permissions:role_permissions!inner(permission:permissions!inner(key)))')
    .eq('user_id', user.id)

  if (error || !data) return []

  const keys = new Set<string>()
  for (const ur of data) {
    const role = ur.role as unknown as {
      role_permissions: { permission: { key: string } }[]
    }
    for (const rp of role.role_permissions) {
      keys.add(rp.permission.key)
    }
  }

  return Array.from(keys)
}

/**
 * Checks whether the current user holds a specific permission.
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const permissions = await getUserPermissions()
  return permissions.includes(permission)
}
