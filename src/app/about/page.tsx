import { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShieldCheck, Cpu, Lock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us - Fast & Private PDF Tools | pdfkitfree',
  description:
    'pdfkitfree was founded to eliminate the privacy vulnerabilities of cloud-based PDF conversion. Learn how our browser-first architecture protects your sensitive documents.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About pdfkitfree - Browser-First Document SaaS',
    description: 'Learn why zero-upload PDF processing is the future of document security.',
  },
};

export default function AboutPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'About Us' }]} />

        {/* Hero */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 mb-3">
            Our Mission & Architecture
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Building the Most Private, High-Performance Document SaaS
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            pdfkitfree is engineered on an unapologetic belief: your confidential legal documents, bank statements, and tax declarations should never have to be transmitted to unknown cloud servers to be merged, edited, or signed.
          </p>
        </div>

        {/* Story */}
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">The Problem with Traditional PDF Converters</h2>
          <p>
            For over a decade, virtually every popular online PDF tool operated on a simple, outdated model: you upload your file to an AWS or GCP storage bucket, an asynchronous worker executes a server-side command (often ImageMagick or Ghostscript), and you download the converted file minutes later.
          </p>
          <p>
            While convenient, this model represents a glaring compliance failure for legal practitioners, healthcare providers, and privacy-conscious enterprises. Temporary disk caches, access logs, and malicious server compromises put your most sensitive records at risk.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10">The pdfkitfree Browser-First Breakthrough</h2>
          <p>
            Thanks to modern WebAssembly (Wasm) runtimes and high-performance JavaScript engines like <code>pdf-lib</code>, full PDF parsing, page manipulation, encryption, and visual signing can happen locally within your web browser sandbox.
          </p>
        </div>

        {/* 3 Core Architecture Tenets */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6" id="security">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">100% Client-Side</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Files are processed in device RAM and released immediately when you close the tab. No storage backend exists.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 mb-4">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Local Hardware Speed</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              No network upload latency. Large PDFs compile at the direct speed of your machine’s multi-core CPU.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">ESIGN & UETA Ready</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Structured to satisfy electronic signature audit criteria without locking your documents behind paywalls.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-brand-600 to-teal-600 p-8 sm:p-10 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Try our browser-first tools today</h3>
            <p className="mt-1 text-sm text-brand-100">
              Combine your PDF files with our live Merge PDF tool in seconds.
            </p>
          </div>
          <Link
            href="/tools/merge-pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 shadow hover:bg-slate-50 transition"
          >
            <span>Launch Merge PDF</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
