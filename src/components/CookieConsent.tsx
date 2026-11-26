'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'pdfkitfree_cookie_consent_v1';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) {
        // Small delay to prevent layout thrash on initial render
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // In private browsing mode where localStorage might be blocked
    }
  }, []);

  const handleConsent = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
      // ignore
    }
    setVisible(false);

    // If Google tag is present, update consent state
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: choice === 'accepted' ? 'granted' : 'denied',
        ad_storage: choice === 'accepted' ? 'granted' : 'denied',
        ad_user_data: choice === 'accepted' ? 'granted' : 'denied',
        ad_personalization: choice === 'accepted' ? 'granted' : 'denied',
      });
    }
  };

  if (!visible) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-3 left-3 right-3 z-50 rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-5 shadow-lift sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-[460px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="text-sm leading-relaxed text-ink-soft">
            <p className="font-display text-base font-bold text-ink">Cookie choices</p>
            <p className="mt-1">
              We use necessary cookies to run the site. With your OK we also use Google Analytics and Google AdSense cookies, which help keep the tools free. See our{' '}
              <Link href="/privacy" className="text-brand-600 underline font-medium hover:text-brand-700">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-brand-600 underline font-medium hover:text-brand-700">
                Terms of Service
              </Link>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleConsent('declined')}
            className="min-h-[44px] flex-1 cursor-pointer rounded-full border-[1.5px] border-[#E3E1F5] bg-white px-4 text-sm font-bold text-ink transition hover:border-brand-600"
          >
            Only necessary
          </button>
          <button
            type="button"
            onClick={() => handleConsent('accepted')}
            className="min-h-[44px] flex-1 cursor-pointer rounded-full bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => handleConsent('declined')}
            aria-label="Dismiss cookie notice"
            className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-mist hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
