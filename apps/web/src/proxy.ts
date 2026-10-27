import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

// Set by the API on login; httpOnly, but visible to this server-side check.
const SESSION_COOKIE = 'mersal_rt';
const PROTECTED_AREAS = new Set(['app', 'admin']);

export default function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/');
  const hasLocale = (routing.locales as readonly string[]).includes(segments[1] ?? '');
  const locale = hasLocale ? segments[1] : routing.defaultLocale;
  const area = hasLocale ? segments[2] : segments[1];

  if (area && PROTECTED_AREAS.has(area) && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
