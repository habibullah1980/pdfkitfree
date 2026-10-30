import { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShieldCheck, Cpu, Lock, ArrowRight, HeartHandshake, Eye, Layers } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'About Us - Fast & Private PDF Tools | PDFKitFree' },
  description:
    'Learn about the mission, engineering philosophy, and privacy-first architecture behind PDFKitFree. We build client-side document productivity tools where your files stay on your device.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Us - Fast & Private PDF Tools | PDFKitFree',
    description: 'Learn why zero-upload PDF processing is the future of digital document privacy.',
    url: 'https://www.pdfkitfree.online/about',
    type: 'website',
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
            Our Mission &amp; Engineering Philosophy
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Empowering Privacy-First Document Productivity
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            PDFKitFree was engineered on a clear principle: confidential legal contracts, financial spreadsheets, tax forms, and medical records should never need to be uploaded to an unverified third-party cloud server simply to be merged, split, or signed.
          </p>
        </div>

        {/* Narrative & Problem Statement */}
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">The Problem with Traditional Web PDF Converters</h2>
          <p>
            For more than a decade, standard web-based document utilities followed an identical, outdated design: users upload their files to a remote cloud storage bucket, an asynchronous backend queue executes command-line binaries on an external server, and the resulting file is sent back via a download link.
          </p>
          <p>
            While functional, this model exposes individuals and businesses to significant data retention risks, compliance challenges (under GDPR, HIPAA, and CCPA), and potential data leaks from multitenant server storage caches. Furthermore, uploading multi-hundred-megabyte files over residential or mobile connections causes needless bandwidth delays.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-10">The PDFKitFree Browser-First Architecture</h2>
          <p>
            Advances in modern browser engines, WebAssembly (Wasm), and client-side JavaScript libraries (such as <code>pdf-lib</code> and <code>PDF.js</code>) now allow full PDF parsing, vector rendering, cryptographic hashing, and visual document manipulation to happen locally within your web browser sandbox.
          </p>
          <p>
            When you use PDFKitFree tools, your computer or phone&apos;s own processor and RAM execute the document transformation. Once you finish downloading your result or close the tab, that temporary memory buffer is immediately reclaimed by your operating system.
          </p>
        </div>

        {/* 3 Core Architecture Tenets */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6" id="security">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Zero Server Uploads</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Core PDF operations happen 100% inside your browser sandbox. Documents never transit over external networks or get logged on cloud disks.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 mb-4">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Hardware-Accelerated Speed</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              No upload or download queues. Documents compile at the raw computational speed of your device&apos;s multi-core CPU and memory.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Complete Document Ownership</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              You retain 100% of the copyright, intellectual property, and confidentiality rights to all documents processed on our platform.
            </p>
          </div>
        </div>

        {/* How We Operate & Transparency */}
        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-brand-600" />
            <span>How PDFKitFree Is Sustained</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            PDFKitFree is an independent web application maintained by passionate software engineers focused on browser-first utility software. To keep our 38+ core PDF tools completely free and accessible to students, freelancers, and businesses worldwide without paywalls, our operational infrastructure is funded through:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
                <Eye className="h-4 w-4 text-brand-600" />
                <span>Ethical, Non-Intrusive Ads</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                We partner with certified advertising networks like Google AdSense to display relevant banner ads that never obstruct document upload zones or deceive visitors.
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
                <Layers className="h-4 w-4 text-teal-600" />
                <span>Optional Pro Subscriptions</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Power users who need advanced server-assisted features—such as higher-quota AI contract analysis and multi-party signing workflows—can choose an optional paid upgrade.
              </p>
            </div>
          </div>
        </div>

        {/* Team & Contact Information */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Contact &amp; Editorial Inquiries</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We value feedback from developers, legal professionals, and everyday users. If you have questions about our security architecture, feature suggestions, or bug reports, please reach out directly:
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition"
            >
              <span>Contact Us Online</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="mailto:support@pdfkitfree.online"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
            >
              Email Support (support@pdfkitfree.online)
            </a>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
            >
              Read Privacy Policy
            </Link>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-brand-600 to-teal-600 p-8 sm:p-10 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Try our browser-first tools today</h3>
            <p className="mt-1 text-sm text-brand-100">
              Combine, split, compress, or sign your PDF files in seconds with zero uploads.
            </p>
          </div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 shadow hover:bg-slate-50 transition flex-shrink-0"
          >
            <span>Browse All 38 Tools</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
