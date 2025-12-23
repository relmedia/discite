import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';

const locales = ['en', 'sv'] as const;
const defaultLocale = 'sv';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth'];

// Your app's base domains - customize these for your deployment
// These are domains that are NOT custom tenant domains
const BASE_DOMAINS = [
  'localhost',
  'discite.app',
  'www.discite.app',
  // Add your production domains here
];

/**
 * Check if the hostname is a custom domain (not a base domain or subdomain of base domains)
 */
function isCustomDomain(hostname: string): boolean {
  // Remove port for localhost
  const cleanHost = hostname.split(':')[0];
  
  // Check if it's not a base domain and not a subdomain of base domains
  return !BASE_DOMAINS.some(base => 
    cleanHost === base || cleanHost.endsWith(`.${base}`)
  );
}

/**
 * Extract custom domain from hostname if applicable
 */
function getCustomDomain(hostname: string): string | null {
  if (isCustomDomain(hostname)) {
    return hostname.split(':')[0]; // Remove port
  }
  return null;
}

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as any)) {
    return segments[0];
  }
  return null;
}

function getLocaleFromHeaders(request: NextRequest): string {
  // Check cookie first
  const localeCookie = request.cookies.get('locale')?.value;
  if (localeCookie && locales.includes(localeCookie as any)) {
    return localeCookie;
  }
  
  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language') || '';
  if (acceptLanguage.includes('en')) {
    return 'en';
  }
  
  // Default to Swedish
  return defaultLocale;
}

function isPublicRoute(pathname: string): boolean {
  const cleanPath = pathname.replace(/^\/(en|sv)/, '') || '/';
  return publicRoutes.some(route => cleanPath.startsWith(route)) || cleanPath === '/';
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Detect custom domain
  const customDomain = getCustomDomain(hostname);
  
  // Create response (will be modified as needed)
  let response: NextResponse;
  
  // Skip ALL API routes - let them pass through without modification
  if (pathname.startsWith('/api')) {
    response = NextResponse.next();
    // Still set custom domain cookie for API routes if applicable
    if (customDomain) {
      response.cookies.set('tenant-custom-domain', customDomain, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  }
  
  // Skip static files
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }
  
  // Skip root path - let landing page be served
  if (pathname === '/') {
    response = NextResponse.next();
    // Set custom domain cookie if applicable
    if (customDomain) {
      response.cookies.set('tenant-custom-domain', customDomain, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    } else {
      // Clear the cookie if not on a custom domain
      response.cookies.delete('tenant-custom-domain');
    }
    return response;
  }
  
  // Get locale from path or detect from headers
  const pathLocale = getLocaleFromPath(pathname);
  const detectedLocale = pathLocale || getLocaleFromHeaders(request);
  
  // Check if the route requires authentication
  const needsAuth = !isPublicRoute(pathname);
  
  if (needsAuth && !request.auth) {
    // User is not authenticated, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    response = NextResponse.redirect(loginUrl);
    // Set custom domain cookie on redirect too
    if (customDomain) {
      response.cookies.set('tenant-custom-domain', customDomain, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  }

  // If locale is in URL and it's the default locale, redirect to clean URL
  if (pathLocale === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(`/${defaultLocale}`, '') || '/';
    response = NextResponse.redirect(url);
    if (customDomain) {
      response.cookies.set('tenant-custom-domain', customDomain, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  }
  
  // If no locale in path, handle based on detected locale
  if (!pathLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}${pathname}`;
    
    // For non-default locales, redirect to include the locale in the URL
    // This ensures the browser URL reflects the correct locale
    if (detectedLocale !== defaultLocale) {
      response = NextResponse.redirect(url);
    } else {
      // For default locale (Swedish), just rewrite internally
      response = NextResponse.rewrite(url);
    }
    
    // Set custom domain cookie
    if (customDomain) {
      response.cookies.set('tenant-custom-domain', customDomain, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    } else {
      response.cookies.delete('tenant-custom-domain');
    }
    
    return response;
  }

  response = NextResponse.next();
  
  // Set or clear custom domain cookie
  if (customDomain) {
    response.cookies.set('tenant-custom-domain', customDomain, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  } else {
    response.cookies.delete('tenant-custom-domain');
  }
  
  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - let Next.js handle them directly)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
  ],
};
