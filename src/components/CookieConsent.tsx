'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, X } from 'lucide-react';

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
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-4xl">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Your Privacy &amp; Cookie Choices on PDFKitFree</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                <ShieldCheck className="h-3 w-3" /> Zero Server Document Uploads
              </span>
            </p>
            <p className="mt-1">
              We use necessary cookies to operate our site, Google Analytics to measure aggregate performance, and third-party advertising cookies (including Google AdSense) to display relevant advertisements that keep our core PDF tools free. You can choose whether to allow non-essential analytics and advertising cookies. Learn more in our{' '}
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

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => handleConsent('declined')}
            className="w-1/2 md:w-auto px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Decline Non-Essential
          </button>
          <button
            type="button"
            onClick={() => handleConsent('accepted')}
            className="w-1/2 md:w-auto px-5 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition cursor-pointer"
          >
            Accept All Cookies
          </button>
          <button
            type="button"
            onClick={() => handleConsent('declined')}
            aria-label="Dismiss cookie notice"
            className="hidden md:inline-flex p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
