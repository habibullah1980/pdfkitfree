'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { NdaUploadWorkspace } from '@/components/NdaUploadWorkspace';
import { NdaGeneratorWorkspace } from '@/components/NdaGeneratorWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  Upload,
  FileText,
  ShieldCheck,
  FileSignature,
  History,
  Trash2,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';

type TabId = 'upload' | 'generate' | 'history';

interface SigningRecord {
  id: string;
  title: string;
  documentType: 'generated' | 'uploaded';
  status: 'signed' | 'draft' | 'pending';
  fileName: string;
  fileSize: number;
  pageCount: number;
  disclosingParty?: string;
  receivingParty?: string;
  signedAt: string | null;
  createdAt: string;
}

function SigningHistoryTab() {
  const [records, setRecords] = useState<SigningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nda/requests', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load signing history');
      const data = await res.json();
      setRecords(data.requests || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this signing record? This only removes it from your history, not from your downloaded files.')) {
      return;
    }

    try {
      const res = await fetch(`/api/nda/requests?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete record');
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete agreement record.');
    }
  };

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return '—';
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600 mr-2" />
        <span className="text-sm text-slate-600">Loading signing history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-300">
          <FileSignature className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-base font-bold text-slate-900">No Signing Records Found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Sign your first non-disclosure agreement or contract using the Upload or Generate tabs above.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Records are saved automatically every time you complete and sign a document.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Signing History ({records.length} Records)
            </h4>
            <button
              onClick={loadHistory}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Refresh
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {records.map((record) => (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 flex-shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                      {record.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        record.status === 'signed'
                          ? 'bg-teal-100 text-teal-800'
                          : record.status === 'draft'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {record.status}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{record.documentType}</span>
                      <span>•</span>
                      <span>{formatFileSize(record.fileSize)}</span>
                      {record.signedAt && (
                        <>
                          <span>•</span>
                          <span>Signed {formatDate(record.signedAt)}</span>
                        </>
                      )}
                    </div>
                    {(record.disclosingParty || record.receivingParty) && (
                      <div className="text-[11px] text-slate-600 mt-0.5 truncate max-w-xs">
                        {record.disclosingParty && (
                          <span>Disclosing: <strong className="text-slate-800">{record.disclosingParty}</strong></span>
                        )}
                        {record.disclosingParty && record.receivingParty && ' → '}
                        {record.receivingParty && (
                          <span>Receiving: <strong className="text-slate-800">{record.receivingParty}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(record.id)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NdaESignContent() {
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get('tab') || 'upload') as TabId;
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const { user } = useAuth();

  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'NDA & eSign' }]} />

        {/* Hero Header */}
        <div className="max-w-4xl mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-3">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Zero Server Transmission: Documents Remain in Browser RAM</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            NDA & eSign Hub
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Upload existing NDAs for digital signing, or generate standardized one-way and mutual non-disclosure agreements from editable legal templates.
          </p>

          {user && (
            <div className="mt-3 flex items-center gap-2 text-xs text-teal-900">
              <UserCheck className="h-4 w-4 text-teal-600" />
              <span>
                Signed in as <strong>{user.name}</strong>. Signing records will be saved to your account.
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 mb-8 overflow-x-auto pb-0">
          {[
            { id: 'upload' as TabId, label: 'Upload & Sign NDA', icon: Upload },
            { id: 'generate' as TabId, label: 'Generate New NDA', icon: FileText },
            { id: 'history' as TabId, label: 'My Signing History', icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap -mb-px ${
                activeTab === id
                  ? 'border border-b-white border-slate-200 bg-white text-brand-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === 'upload' && <NdaUploadWorkspace />}
        {activeTab === 'generate' && <NdaGeneratorWorkspace />}
        {activeTab === 'history' && <SigningHistoryTab />}
      </div>
    </div>
  );
}

export default function NdaESignPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>}>
      <AuthGuard
        title="Sign In Required to Access NDA & eSign Hub"
        description="To protect document confidentiality and maintain secure signing audit records, you need to be authenticated before accessing the NDA signing and generation tools."
      >
        <NdaESignContent />
      </AuthGuard>
    </Suspense>
  );
}
