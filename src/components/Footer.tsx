import React from 'react';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/site-config';
import { Shield, Lock, Zap } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { VisitorCounter } from '@/components/VisitorCounter';

export function Footer() {
  return (
    <footer className="bg-ink text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex rounded-lg" aria-label="PDFKitFree home">
              <Logo size={36} tone="light" />
            </Link>
            <p className="text-sm text-[#C9C7EA] leading-relaxed">
              Fast, privacy-first PDF tools and digital document workflows. Process documents directly in your web browser with zero server uploads.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#C9C7EA]">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-sun" /> Runs in your browser
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-sun" /> Instant results
              </span>
            </div>
          </div>

          {/* Tools Links */}
          <div>
            <h3 className="font-display text-base font-bold text-white">
              PDF Utilities
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.tools.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#C9C7EA] transition-colors hover:text-sun"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular searches */}
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Popular
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.popular.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#C9C7EA] transition-colors hover:text-sun"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Company & Docs
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#C9C7EA] transition-colors hover:text-sun"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Privacy & Trust
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.legal.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#C9C7EA] transition-colors hover:text-sun"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-white">
                <Shield className="h-4 w-4 text-sun flex-shrink-0" />
                <span>Zero File Retention Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs text-[#C9C7EA]">
              &copy; {new Date().getFullYear()} PDFKitFree. All rights reserved.
            </p>
            <div className="flex items-center">
              <VisitorCounter />
            </div>
          </div>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-xs text-[#C9C7EA] hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-[#C9C7EA] hover:text-white">
              Terms
            </Link>
            <Link href="/sitemap.xml" className="text-xs text-[#C9C7EA] hover:text-white">
              XML Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
