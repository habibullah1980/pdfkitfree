'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Users } from 'lucide-react';

const SESSION_VISIT_KEY = 'pdfkitfree_session_counted';

export function VisitorCounter() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function handleVisit() {
      try {
        // Exclude non-public pages from incrementing
        const isPrivate =
          pathname.startsWith('/admin') ||
          pathname.startsWith('/settings') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/signup') ||
          pathname.startsWith('/forgot-password') ||
          pathname.startsWith('/reset-password') ||
          pathname.startsWith('/verify-email');

        // Check if session has already counted visit
        let alreadyCountedInSession = false;
        try {
          alreadyCountedInSession = sessionStorage.getItem(SESSION_VISIT_KEY) === '1';
        } catch {
          // sessionStorage may be blocked in strict private modes
        }

        let res: Response;
        if (!isPrivate && !alreadyCountedInSession && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          try {
            sessionStorage.setItem(SESSION_VISIT_KEY, '1');
          } catch {
            // ignore
          }

          res = await fetch('/api/visitor-counter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pathname }),
            cache: 'no-store',
          });
        } else {
          // Simply fetch current count without incrementing
          res = await fetch('/api/visitor-counter', { method: 'GET', cache: 'no-store' });
        }

        if (!res.ok) throw new Error('API returned error');
        const data = await res.json();
        if (isMounted && typeof data.count === 'number') {
          setCount(data.count);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[VisitorCounter] Failed to load visitor count:', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    handleVisit();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if (error) {
    // Subtle fallback so footer never breaks
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-xs transition hover:border-slate-300">
      <Users className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
      <span>Website Visits:</span>
      {loading ? (
        <span className="inline-block h-3 w-12 animate-pulse rounded-sm bg-slate-200" />
      ) : (
        <strong className="font-semibold text-slate-800">
          {count !== null ? count.toLocaleString('en-US') : '—'}
        </strong>
      )}
    </div>
  );
}
