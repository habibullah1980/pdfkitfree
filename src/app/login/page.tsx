'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2, KeyRound } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/nda-esign';
  const reason = searchParams.get('reason');

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await login(email, password, requiresMfa ? mfaCode : undefined);
    setSubmitting(false);

    if (res.success) {
      router.push(returnUrl);
    } else if (res.requiresMfa) {
      setRequiresMfa(true);
      setError(null);
    } else {
      setError(res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-3">
          {requiresMfa ? <KeyRound className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {requiresMfa ? 'Two-Factor Challenge' : 'Sign In to pdfkitfree'}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500">
          {requiresMfa
            ? 'Enter the 6-digit verification code from your authenticator app.'
            : 'Access your NDA documents, legal templates, and electronic signing dashboard.'}
        </p>
      </div>

      {reason === 'nda-required' && !requiresMfa && (
        <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50/70 p-3 text-xs text-brand-900 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Authentication Required:</strong> Please sign in or create a free account to upload, generate, and sign non-disclosure agreements.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!requiresMfa ? (
          <>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com or habibullah"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              6-Digit Authenticator Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength={8}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456 or Recovery Key"
                autoFocus
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-center font-mono tracking-widest text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Lost device? Enter one of your saved 10-character backup recovery codes.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{requiresMfa ? 'Verifying Code...' : 'Signing In...'}</span>
            </>
          ) : (
            <>
              <span>{requiresMfa ? 'Confirm & Sign In' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {requiresMfa && (
          <button
            type="button"
            onClick={() => {
              setRequiresMfa(false);
              setMfaCode('');
            }}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
          >
            &larr; Back to password login
          </button>
        )}
      </form>

      {!requiresMfa && (
        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
          Don&apos;t have an account?{' '}
          <Link
            href={`/signup${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Create free account
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <Suspense fallback={<div className="text-center p-8 text-slate-500">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
