'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, ImageIcon, Loader2, RefreshCw, Search, Star } from 'lucide-react';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/feedback-validation';

type Status = keyof typeof STATUS_LABELS;
type Category = keyof typeof CATEGORY_LABELS;

interface Row {
  id: number;
  createdAt: string;
  category: Category;
  rating: number;
  message: string;
  email: string | null;
  pagePath: string | null;
  toolSlug: string | null;
  hasScreenshot: boolean;
  status: Status;
  important: boolean;
  adminNote: string | null;
}

const STATUS_STYLE: Record<Status, string> = {
  new: 'bg-sky-500/15 text-sky-300',
  reviewing: 'bg-amber-500/15 text-amber-300',
  planned: 'bg-violet-500/15 text-violet-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  declined: 'bg-slate-500/20 text-slate-300',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function FeedbackAdminClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [important, setImportant] = useState(false);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams({ page: String(page) });
    if (status) sp.set('status', status);
    if (category) sp.set('category', category);
    if (important) sp.set('important', '1');
    if (search) sp.set('q', search);
    try {
      const res = await fetch(`/api/admin/feedback?${sp}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load feedback.');
      setRows(data.rows);
      setTotal(data.total);
      setCounts(data.counts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, status, category, important, search]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: number, body: Partial<Pick<Row, 'status' | 'important' | 'adminNote'>>) => {
    setSaving(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the change.');
      setRows((rs) => rs.map((r) => (r.id === id ? data.feedback : r)));
      if (body.status) load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / 25));
  const select = 'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#4B3FE4] focus:outline-none';

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Admin dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-extrabold">User feedback</h1>
            <p className="text-sm text-slate-400">Bug reports, ideas and ratings sent from the site. Only you can see this page.</p>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(status === s ? '' : s);
                setPage(1);
              }}
              className={`rounded-2xl border p-3 text-left transition ${status === s ? 'border-[#4B3FE4] bg-[#4B3FE4]/20' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}
            >
              <div className="text-xs font-semibold text-slate-400">{STATUS_LABELS[s]}</div>
              <div className="text-2xl font-extrabold">{counts[s] ?? 0}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form
            className="relative min-w-[220px] flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q.trim());
              setPage(1);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search message, email or page"
              aria-label="Search feedback"
              className={`${select} w-full pl-9`}
            />
          </form>
          <select aria-label="Status" value={status} onChange={(e) => (setStatus(e.target.value as Status | ''), setPage(1))} className={select}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select aria-label="Category" value={category} onChange={(e) => (setCategory(e.target.value as Category | ''), setPage(1))} className={select}>
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-300">
            <input type="checkbox" checked={important} onChange={(e) => (setImportant(e.target.checked), setPage(1))} className="h-4 w-4 accent-[#4B3FE4]" />
            Important only
          </label>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="text-sm text-slate-400">
          {total} item{total === 1 ? '' : 's'}
          {search ? ` matching "${search}"` : ''}
        </div>

        {loading && !rows.length ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : !rows.length ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">No feedback here yet.</div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className={`rounded-2xl border bg-slate-900 p-4 sm:p-5 ${r.important ? 'border-amber-500/60' : 'border-slate-800'}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => patch(r.id, { important: !r.important })}
                    aria-pressed={r.important}
                    aria-label={r.important ? 'Unmark important' : 'Mark important'}
                    title={r.important ? 'Unmark important' : 'Mark important'}
                    className="rounded-lg p-1 hover:bg-slate-800"
                  >
                    <Star className={`h-5 w-5 ${r.important ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                  </button>
                  <span className="font-mono text-slate-500">#{r.id}</span>
                  <span className="text-slate-400">{fmtDate(r.createdAt)}</span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 font-semibold">{CATEGORY_LABELS[r.category]}</span>
                  <span className="text-amber-300" aria-label={`${r.rating} of 5 stars`}>
                    {'★'.repeat(r.rating)}
                    <span className="text-slate-600">{'★'.repeat(5 - r.rating)}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                  {saving === r.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">{r.message}</p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                  {r.pagePath && (
                    <span>
                      Page:{' '}
                      <a href={r.pagePath} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-300 hover:underline">
                        {r.pagePath}
                      </a>
                    </span>
                  )}
                  {r.email && (
                    <span>
                      Email:{' '}
                      <a href={`mailto:${r.email}`} className="font-semibold text-sky-300 hover:underline">
                        {r.email}
                      </a>
                    </span>
                  )}
                  {r.hasScreenshot && (
                    <a
                      href={`/api/admin/feedback/screenshot?id=${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-sky-300 hover:underline"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> View screenshot
                    </a>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    Status
                    <select value={r.status} onChange={(e) => patch(r.id, { status: e.target.value as Status })} className={select} disabled={saving === r.id}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-1 gap-2">
                    <input
                      aria-label={`Private note for feedback ${r.id}`}
                      value={notes[r.id] ?? r.adminNote ?? ''}
                      maxLength={2000}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Private note (only you see this)"
                      className={`${select} flex-1`}
                    />
                    {notes[r.id] !== undefined && notes[r.id] !== (r.adminNote ?? '') && (
                      <button
                        type="button"
                        onClick={async () => {
                          await patch(r.id, { adminNote: notes[r.id] });
                          setNotes((n) => {
                            const c = { ...n };
                            delete c[r.id];
                            return c;
                          });
                        }}
                        className="rounded-xl bg-[#4B3FE4] px-4 py-2 text-sm font-bold text-white hover:bg-[#3d32c9]"
                      >
                        Save note
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl bg-slate-800 p-2 disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-slate-800 p-2 disabled:opacity-40" aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
