'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MailCheck, CheckCircle2, AlertCircle, Loader2, RotateCcw, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/nda-esign';

  const { user, verifyEmail, resendVerification, loading } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | undefined>(user?.devVerificationCode);

  useEffect(() => {
    if (user?.devVerificationCode) {
      setPreviewCode(user.devVerificationCode);
    }
  }, [user]);

  // Pre-fill for user convenience if available
  const handleUsePreviewCode = () => {
    if (previewCode) {
      setCode(previewCode);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const res = await verifyEmail(code);
    setSubmitting(false);

    if (res.success) {
      setSuccessMsg('Email verified successfully! Redirecting...');
      setTimeout(() => {
        router.push(returnUrl);
      }, 1200);
    } else {
      setError(res.error || 'Invalid code');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    const res = await resendVerification();
    setResending(false);

    if (res.success) {
      if (res.codePreview) {
        setPreviewCode(res.codePreview);
      }
      setSuccessMsg('A new 6-digit verification code has been dispatched.');
    } else {
      setError(res.error || 'Failed to resend code');
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-slate-500">Loading session...</div>;
  }

  if (user?.emailVerified) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-teal-200 bg-teal-50/50 p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600 mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Your Email is Already Verified</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your account ({user.email}) is fully authenticated and ready for NDA signing.
        </p>
        <Link
          href={returnUrl}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-sm"
        >
          <span>Continue to NDA & eSign</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-3">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Verify Your Email Address
        </h1>
        <p className="mt-1.5 text-xs text-slate-500">
          We sent a 6-digit confirmation code to{' '}
          <strong className="text-slate-800">{user?.email || 'your email'}</strong>.
        </p>
      </div>

      {/* Demo / Test helper banner */}
      {previewCode && (
        <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50/70 p-3 text-xs text-brand-900">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Verification Code:</span>
            <button
              type="button"
              onClick={handleUsePreviewCode}
              className="text-[11px] font-bold text-brand-700 underline hover:text-brand-900"
            >
              Auto-fill code
            </button>
          </div>
          <p className="mt-1 font-mono text-sm tracking-widest font-bold text-brand-700">
            {previewCode}
          </p>
          <span className="text-[10px] text-brand-600">
            (Code displayed for test verification)
          </span>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            6-Digit Verification Code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full text-center tracking-widest text-lg font-mono rounded-lg border border-slate-300 py-2.5 px-3 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || code.length < 6}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <>
              <span>Confirm & Verify Email</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{resending ? 'Resending...' : 'Resend Code'}</span>
        </button>

        <Link
          href={returnUrl}
          className="font-medium text-slate-500 hover:text-slate-800"
        >
          Skip for now &rarr;
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <Suspense fallback={<div className="text-center p-8 text-slate-500">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
