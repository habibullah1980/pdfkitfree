'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, UserPlus, ShieldCheck, ArrowRight, Loader2, FileCheck2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AuthGuard({
  children,
  title = 'Sign In Required for NDA & eSign',
  description = 'To guarantee secure audit trails, prevent unauthorized document tampering, and keep your signing records private, please sign in or register a free account.',
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Verifying session credentials...</p>
      </div>
    );
  }

  if (!user) {
    const returnUrl = encodeURIComponent(pathname || '/nda-esign');

    return (
      <div className="mx-auto max-w-3xl my-8 px-4 sm:px-6">
        <div className="rounded-2xl border-2 border-brand-200 bg-white p-8 sm:p-12 shadow-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4 shadow-sm">
            <Lock className="h-8 w-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-4">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Secure Audit Trail & ESIGN Protection</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/login?returnUrl=${returnUrl}&reason=nda-required`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/signup?returnUrl=${returnUrl}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Free Account</span>
            </Link>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <FileCheck2 className="h-4 w-4 text-teal-600" />
              <span>One-Way & Mutual NDA Templates</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              <span>Client-Side In-Memory PDF Signing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Free PDF Tools</span>
              <span>(Merge, Split, Compress) require no login</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
