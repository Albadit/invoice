import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { fallbackLng, languages, type Locale } from '@/lib/i18n/settings';

const LOCALE_COOKIE = 'NEXT_LOCALE';

function getLocaleFromRequest(request: NextRequest): Locale {
  // Check cookie first
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && languages.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().substring(0, 2));
    
    for (const locale of preferredLocales) {
      if (languages.includes(locale as Locale)) {
        return locale as Locale;
      }
    }
  }

  return fallbackLng;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Get and set locale
  const locale = getLocaleFromRequest(request);
  
  // Set locale cookie if not present
  if (!request.cookies.get(LOCALE_COOKIE)?.value) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  // Supabase auth handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          // Re-apply locale cookie after Supabase modifies cookies
          if (!request.cookies.get(LOCALE_COOKIE)?.value) {
            response.cookies.set(LOCALE_COOKIE, locale, {
              path: '/',
              maxAge: 60 * 60 * 24 * 365,
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  // const { data } = await supabase.auth.getClaims();
  // const user = data?.claims;

  // // Redirect to login if not authenticated (except for auth routes)
  // if (
  //   !user &&
  //   !request.nextUrl.pathname.startsWith('/login') &&
  //   !request.nextUrl.pathname.startsWith('/auth')
  // ) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/auth/login';
  //   return NextResponse.redirect(url);
  // }

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
