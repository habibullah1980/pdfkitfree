import { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { 
  PenTool, 
  ShieldCheck, 
  Lock, 
  Clock, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'Sign PDF Online - Free Electronic Signature | PDFKitFree' },
  description:
    'Sign PDF documents online for free with legal electronic signatures. Create signatures, sign NDAs, vendor contracts, and agreements privately in your browser.',
  alternates: {
    canonical: '/sign-pdf',
  },
  openGraph: {
    title: 'Sign PDF Online - Free Electronic Signature | PDFKitFree',
    description:
      'Fast, legally binding electronic signatures. 100% private browser-based document signing.',
    url: 'https://www.pdfkitfree.online/sign-pdf',
    type: 'website',
  },
};

export default function SignPdfPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Sign PDF' }]} />

        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center pt-4 pb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-6">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Compliant with ESIGN & UETA Standards</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Sign PDF Documents <span className="text-brand-600">Online & Securely</span>
          </h1>

          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Create, draw, or type your legally binding electronic signature. Prepare contracts, vendor agreements, and consent forms with zero cloud storage vulnerabilities.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/nda-generator"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <span>Generate & Sign an NDA</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tools/merge-pdf"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Try Merge Tool</span>
            </Link>
          </div>
        </div>

        {/* Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-b border-slate-100">
          <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600 mb-4">
              <PenTool className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">3 Signature Styles</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Draw your signature by mouse or finger, type your name using elegant cursive fonts, or upload a pre-scanned signature graphic.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-600 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Zero Server Storage</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Contracts contain salary numbers, client trade secrets, and social security IDs. Our browser-first engine signs documents without uploading them.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600 mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cryptographic Audit Trail</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every document is stamped with UTC timestamps, browser fingerprints, and SHA-256 integrity hashes for verifiable authentication.
            </p>
          </div>
        </div>

        {/* Step by Step Workflow */}
        <div className="py-16">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-center mb-12">
            How Electronic Signing Works on pdfkitfree
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                1
              </div>
              <h4 className="font-semibold text-slate-900">Upload PDF</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Choose the PDF agreement you want to execute from your device.
              </p>
            </div>

            <div className="relative p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                2
              </div>
              <h4 className="font-semibold text-slate-900">Add Signature Fields</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Position your signature block, printed name, initials, and execution date.
              </p>
            </div>

            <div className="relative p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                3
              </div>
              <h4 className="font-semibold text-slate-900">Sign with Consent</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Draw or adopt your e-signature and verify digital consent according to ESIGN statutes.
              </p>
            </div>

            <div className="relative p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                4
              </div>
              <h4 className="font-semibold text-slate-900">Download Completed File</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Obtain a flattened, tamper-evident PDF ready to distribute to all signing parties.
              </p>
            </div>
          </div>
        </div>

        {/* Architecture & Roadmap Section */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/60 to-brand-50/60 p-8 sm:p-12 mb-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Platform Roadmap</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              Next-Gen Multi-Party Signature Routing
            </h3>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              We are actively rolling out our browser-first canvas signature pad and zero-knowledge multi-recipient signing link system. Need to quickly create an agreement right now? Use our ready-to-run NDA Generator.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/tools/sign-pdf"
                className="inline-flex items-center gap-2 rounded-lg bg-[#4b49ac] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#3f3d91] transition"
              >
                <span>Sign PDF Online (Workspace)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/nda-generator"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 transition"
              >
                <span>Go to NDA Generator</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
