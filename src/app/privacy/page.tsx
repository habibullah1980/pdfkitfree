import { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Policy - Zero File Retention Commitment | pdfkitfree',
  description:
    'pdfkitfree is built with a zero-knowledge, browser-first architecture. Read our commitment to document confidentiality and data protection.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Privacy Policy' }]} />

        <div className="max-w-3xl mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Effective Date: October 2026
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Privacy Policy & Data Security
          </h1>
        </div>

        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-6">
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-5 text-sm text-teal-900 font-medium">
            Summary: pdfkitfree processes your PDF files locally on your computer or mobile device. We do not store, view, transmit, or retain your documents on any server.
          </div>

          <h2 className="text-xl font-bold text-slate-900">1. Document Processing & Zero-Upload Model</h2>
          <p>
            When you use pdfkitfree tools such as Merge PDF, Split PDF, or NDA Generator, all document manipulation takes place directly inside your client web browser memory (RAM) using JavaScript and WebAssembly runtimes. Files are not uploaded to our servers or third-party cloud infrastructure.
          </p>

          <h2 className="text-xl font-bold text-slate-900">2. Personal Information Collected</h2>
          <p>
            Because we do not require account registration or credit card billing for our core utility suite, we do not collect personal names, home addresses, or billing details. When you reach out via our contact form, we only receive the name, email address, and message content you explicitly provide.
          </p>

          <h2 className="text-xl font-bold text-slate-900">3. Analytics, Cookies &amp; Approximate Location</h2>
          <p>
            We may collect anonymous, aggregated technical metrics (e.g. browser type, operating system, and general referrer) solely to maintain application reliability, prevent abuse, and optimize performance across device types. We do not use cross-site tracking cookies.
          </p>
          <p>
            For cybersecurity protection (DDoS mitigation and brute-force account defense), we may infer coarse, country-level geolocation from legitimate HTTP network headers. We never collect precise GPS coordinates or device hardware location, nor do we prompt for location browser permissions. Operational activity telemetry is labeled as approximate and retained for a maximum retention period of 90 days.
          </p>

          <h2 className="text-xl font-bold text-slate-900">4. Compliance with International Standards (GDPR & CCPA)</h2>
          <p>
            Under the EU General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), you retain strict rights over your personal data. Because we do not ingest or retain personal data from your uploaded PDFs, there is no document repository subject to access, alteration, or breach.
          </p>

          <h2 className="text-xl font-bold text-slate-900">5. Contact Information</h2>
          <p>
            For privacy inquiries or compliance verification, contact our data protection representative at: <code>privacy@pdfkitfree.com</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
