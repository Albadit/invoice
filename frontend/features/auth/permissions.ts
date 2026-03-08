import { createClient } from '@/lib/supabase/server'
import api, { API_URL } from '@/lib/api/api'

/**
 * Fetches all permission keys for the current authenticated user.
 * Uses the REST API layer with the server-side auth token.
 * Returns an empty array if the user is not authenticated or has no roles.
 */
export async function getUserPermissions(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) return []

  const data = await api.get<{ permission_id: string; role_id: string }[]>(
    `${API_URL}/role_permissions?select=permission_id,role_id!inner(id)&role_id=in.(${await getUserRoleIds(session.access_token)})`,
    { authToken: session.access_token },
  ).catch(() => [] as { permission_id: string }[])

  if (!data.length) return []

  const permissionIds = data.map(rp => rp.permission_id)
  const permissions = await api.get<{ key: string }[]>(
    `${API_URL}/permissions?select=key&id=in.(${permissionIds.join(',')})`,
    { authToken: session.access_token },
  ).catch(() => [] as { key: string }[])

  return permissions.map(p => p.key)
}

/** Get role IDs for the current user via REST API. */
async function getUserRoleIds(authToken: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return ''

  const rows = await api.get<{ role_id: string }[]>(
    `${API_URL}/user_roles?select=role_id&user_id=eq.${user.id}`,
    { authToken },
  ).catch(() => [] as { role_id: string }[])

  return rows.map(r => r.role_id).join(',')
}

/**
 * Checks whether the current user holds a specific permission.
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const permissions = await getUserPermissions()
  return permissions.includes(permission)
}
