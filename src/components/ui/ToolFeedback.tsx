'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { FriendlyError } from '@/lib/friendly-errors';

/** Accessible progress bar with a live status line for screen readers. */
export function ToolProgress({ percent, label }: { percent: number; label: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-ink" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden="true" />
          {label}
        </p>
        <span className="font-bold tabular-nums text-brand-700">{p}%</span>
      </div>
      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
        aria-label="Conversion progress"
      >
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export function ToolError({ error }: { error: FriendlyError }) {
  return (
    <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
      <div>
        <p>{error.message}</p>
        {error.action && (
          <Link href={error.action.href} className="mt-2 inline-block font-bold text-red-700 underline underline-offset-2 hover:text-red-900">
            {error.action.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

export function SuccessHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
      </div>
      <h4 className="text-xl font-bold text-ink" tabIndex={-1} id="tool-success-heading">
        {title}
      </h4>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
