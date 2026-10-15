import React from 'react';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/site-config';
import { FileText, Shield, Lock, Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-slate-900">
                pdfkit<span className="text-[#4b49ac]">free</span>
              </span>
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed">
              Fast, privacy-first PDF tools and digital document workflows. Process documents directly in your web browser with zero server uploads.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-teal-600" /> 100% Client-side
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-brand-600" /> Instant Processing
              </span>
            </div>
          </div>

          {/* Tools Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              PDF Utilities
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.tools.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-600 transition-colors hover:text-brand-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Company & Docs
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-600 transition-colors hover:text-brand-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Privacy & Trust
            </h3>
            <ul className="mt-4 space-y-2.5">
              {SITE_CONFIG.footerLinks.legal.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-600 transition-colors hover:text-brand-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50/70 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-teal-900">
                <Shield className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <span>Zero File Retention Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8 sm:flex sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} pdfkitfree. All rights reserved. Built for security, performance, and legal compliance.
          </p>
          <div className="mt-4 flex space-x-6 sm:mt-0">
            <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-700">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700">
              Terms
            </Link>
            <Link href="/sitemap.xml" className="text-xs text-slate-500 hover:text-slate-700">
              XML Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
