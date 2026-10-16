'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, Mail, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await forgotPassword(email);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } else {
      setError(res.error || 'Failed to submit password reset request.');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reset Password
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Enter the email address registered with your pdfkitfree account.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-xs text-teal-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <span>Password Reset Link Prepared</span>
              </div>
              <p>
                We have generated a secure password reset token for{' '}
                <strong className="text-teal-950">{email}</strong>.
              </p>
            </div>

            {resetToken && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs">
                <p className="font-semibold text-brand-900 mb-1">Direct Reset Shortcut:</p>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  className="font-medium text-brand-700 underline hover:text-brand-900 break-all"
                >
                  Click here to choose a new password &rarr;
                </Link>
              </div>
            )}

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="pt-4 text-center">
              <Link
                href="/login"
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
