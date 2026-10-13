'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { TOOLS, TOOL_CATEGORIES } from '@/lib/tools';
import { ToolCard } from '@/components/ToolCard';
import { 
  Search, 
  ShieldCheck, 
  Zap, 
  Lock, 
  FileCheck2, 
  CheckCircle2, 
  ArrowRight,
  FolderOpen
} from 'lucide-react';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.keywords.some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' || tool.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white py-16 sm:py-24 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-6 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Zero-Upload Guarantee: 100% Client-Side Processing</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl max-w-4xl mx-auto">
            The Private, High-Speed <span className="text-brand-600">PDF Utility Suite</span> & eSign SaaS
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Merge, split, protect, and electronically sign contracts directly inside your web browser. Free from cloud queues, data leaks, and restrictive limits.
          </p>

          {/* Search bar */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PDF tools (e.g., merge, sign, password protect)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Fast Highlights */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl mx-auto text-left">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Instant Execution</p>
                <p className="text-xs text-slate-500">Zero wait times or queues</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">End-to-End Privacy</p>
                <p className="text-xs text-slate-500">Documents never leave device</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Legally Sound</p>
                <p className="text-xs text-slate-500">ESIGN & UETA compliance prep</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Primary Workflows */}
      <section className="py-12 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Merge PDF Feature Banner */}
            <div className="rounded-2xl border border-brand-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="inline-block rounded-md bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                  Ready & Functional
                </span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  Merge Multiple PDFs Instantly
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Combine multi-page reports, presentations, and receipts directly in your browser. Reorder files before export with zero quality loss.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-teal-700">Powered by pdf-lib</span>
                <Link
                  href="/tools/merge-pdf"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
                >
                  <span>Launch Merge Tool</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Electronic Signatures Preview */}
            <div className="rounded-2xl border border-teal-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="inline-block rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
                  Document Workflow
                </span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  Sign PDFs & Generate NDAs
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Prepare standardized agreements and collect digital signatures with tamper-evident audit trails and localized state-law compliance.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/nda-generator"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Create Mutual NDA &rarr;
                </Link>
                <Link
                  href="/sign-pdf"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-teal-700 transition"
                >
                  <span>Explore Signer</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorized Tools Directory */}
      <section className="py-16 bg-white flex-1" id="tools-catalog">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                PDF Tools Directory
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Browse our client-side utility suite designed for professionals and teams.
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Tools ({TOOLS.length})
              </button>
              {TOOL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tool Cards Grid */}
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-base font-medium text-slate-900">No tools matched your search</p>
              <p className="mt-1 text-sm text-slate-500">
                Try searching for another keyword like &quot;merge&quot;, &quot;sign&quot;, or &quot;split&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-4 text-sm font-semibold text-brand-600 hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Security & Architecture Highlights */}
      <section className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Why Legal and Finance Teams Choose FreePDFKit
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Traditional cloud converters store your files on external disks before processing. FreePDFKit keeps the entire document lifecycle local to your browser session.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 mb-4">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">GDPR & Confidentiality Ready</h3>
              <p className="mt-2 text-sm text-slate-600">
                No storage servers, no database leaks, and zero retention logs. What happens in your browser stays strictly in your browser.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Zero Bandwidth Bottlenecks</h3>
              <p className="mt-2 text-sm text-slate-600">
                Because files aren&apos;t uploaded to remote servers, large 200MB PDFs combine at the speed of your local CPU and RAM.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No Hidden Subscriptions</h3>
              <p className="mt-2 text-sm text-slate-600">
                Enjoy essential document tasks without unexpected paywalls or artificial daily limits.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
