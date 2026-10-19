import { NextRequest, NextResponse } from 'next/server';
import { getVisitorCount, incrementVisitorCount } from '@/lib/server/visitor-counter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// List of allowed public page prefixes
const PUBLIC_PAGE_PREFIXES = [
  '/',
  '/tools',
  '/pricing',
  '/ai',
  '/video-compressor',
  '/nda-esign',
  '/sign-pdf',
  '/nda-generator',
  '/blog',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

// List of strictly excluded private and system paths
const EXCLUDED_PATHS = [
  '/admin',
  '/settings',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api',
];

// Simple in-memory rate limiter per IP/client: max 1 increment per 30 seconds
const recentVisitors = new Map<string, number>();

function isKnownBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('bot') ||
    ua.includes('crawl') ||
    ua.includes('spider') ||
    ua.includes('slurp') ||
    ua.includes('mediapartners') ||
    ua.includes('headless') ||
    ua.includes('lighthouse') ||
    ua.includes('bingpreview') ||
    ua.includes('yandex') ||
    ua.includes('baidu')
  );
}

export async function GET() {
  try {
    const count = await getVisitorCount();
    return NextResponse.json(
      { success: true, count },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[VisitorAPI] Error reading count:', error.message);
    return NextResponse.json(
      { error: 'Failed to retrieve visitor count' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pathname: string = typeof body.pathname === 'string' ? body.pathname : '';

    const userAgent = req.headers.get('user-agent') || '';
    if (isKnownBot(userAgent)) {
      // Discard bot request without incrementing
      const count = await getVisitorCount();
      return NextResponse.json({ success: true, count, bot: true });
    }

    // Verify that the pathname is a valid public page
    const isExcluded = EXCLUDED_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    const isPublic = PUBLIC_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (isExcluded || !isPublic) {
      // Non-public page (login, signup, admin, etc.) — do not increment
      const count = await getVisitorCount();
      return NextResponse.json({ success: true, count, skipped: true });
    }

    // Rate limit duplicate increments from same client IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const now = Date.now();
    const lastVisit = recentVisitors.get(ip);
    if (lastVisit && now - lastVisit < 30 * 1000) {
      // Within 30-second window, return current count without incrementing
      const count = await getVisitorCount();
      return NextResponse.json({ success: true, count, rateLimited: true });
    }

    recentVisitors.set(ip, now);

    // Clean up old memory entries periodically
    if (recentVisitors.size > 5000) {
      recentVisitors.forEach((v, k) => {
        if (now - v > 60000) recentVisitors.delete(k);
      });
    }

    const count = await incrementVisitorCount();

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[VisitorAPI] Error incrementing count:', error.message);
    return NextResponse.json(
      { error: 'Failed to record visitor count' },
      { status: 500 }
    );
  }
}
