import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_ROUTES, ROUTES, AUTH_ROUTE_PREFIXES, PROTECTED_ROUTE_PREFIXES } from '@/config/routes'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const pathname = request.nextUrl.pathname

  // ── (auth) routes: /login, /auth/* – always accessible ──────────
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  // ── (protected) routes – derived from folder names via config/routes.ts
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = AUTH_ROUTES.login
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.afterLogin
    return NextResponse.redirect(url)
  }

  // ── Permission-based route protection ──────────────────────────
  if (user && isProtectedRoute) {
    // Query all permissions that have a route (i.e. :access permissions)
    const { data: routePerms } = await supabase
      .from('permissions')
      .select('key, route')
      .not('route', 'is', null)

    // Find the permission whose route matches the current path
    const requiredPermission = routePerms?.find(
      (p: { key: string; route: string }) =>
        pathname === p.route || pathname.startsWith(p.route + '/')
    )

    if (requiredPermission) {
      // Check if the user has this permission
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role:roles!inner(role_permissions:role_permissions!inner(permission:permissions!inner(key)))')
        .eq('user_id', user.sub as string)

      const permissions = new Set<string>()
      if (userRoles) {
        for (const ur of userRoles) {
          const role = ur.role as unknown as {
            role_permissions: { permission: { key: string } }[]
          }
          for (const rp of role.role_permissions) {
            permissions.add(rp.permission.key)
          }
        }
      }

      if (!permissions.has(requiredPermission.key)) {
        const url = request.nextUrl.clone()
        url.pathname = ROUTES.afterLogin
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
