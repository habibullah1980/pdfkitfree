import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, Wrench } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-xl w-full text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 mb-6 shadow-sm">
          <FileQuestion className="h-10 w-10" />
        </div>

        <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Error 404 &bull; Page Not Found
        </span>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Looking for a specific PDF tool?
        </h1>

        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
          The page or document tool you requested may have moved or doesn&apos;t exist. You can browse our complete collection of 38+ free, private PDF utilities below.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Home className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Wrench className="h-4 w-4" />
            <span>Browse All 38 Tools</span>
          </Link>
        </div>

        {/* Popular Quick Links */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-left">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center sm:text-left">
            Popular Free Tools
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Link
              href="/tools/merge-pdf"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              Merge PDF
            </Link>
            <Link
              href="/tools/split-pdf"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              Split PDF
            </Link>
            <Link
              href="/tools/compress-pdf"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              Compress PDF
            </Link>
            <Link
              href="/tools/pdf-to-word"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              PDF to Word
            </Link>
            <Link
              href="/tools/jpg-to-pdf"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              JPG to PDF
            </Link>
            <Link
              href="/tools/protect-pdf"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              Protect PDF
            </Link>
            <Link
              href="/sign-pdf"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              Sign PDF
            </Link>
            <Link
              href="/contact"
              className="p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 font-medium text-slate-700 transition text-center"
            >
              Get Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
