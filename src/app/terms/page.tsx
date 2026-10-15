import { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Terms of Service | pdfkitfree',
  description:
    'Terms and conditions governing the use of the pdfkitfree online document tools and signature utilities.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Terms of Service' }]} />

        <div className="max-w-3xl mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Last Updated: October 2026
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Terms of Service
          </h1>
        </div>

        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-6">
          <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using pdfkitfree (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to all terms and conditions, you must not access or use the Service.
          </p>

          <h2 className="text-xl font-bold text-slate-900">2. Description of Service</h2>
          <p>
            pdfkitfree provides browser-based utilities for PDF manipulation (including merging, reordering, and viewing) as well as legal agreement drafting aids. The tools operate primarily on your client-side device.
          </p>

          <h2 className="text-xl font-bold text-slate-900">3. Legal Disclaimers & No Legal Advice</h2>
          <p>
            The contract templates provided on this website, including the Mutual Non-Disclosure Agreement generator, are supplied for informational and convenience purposes only. pdfkitfree is not a law firm, does not provide legal representation, and does not guarantee the legal enforceability of generated documents under specific jurisdictional laws. Always consult qualified legal counsel before executing significant business agreements.
          </p>

          <h2 className="text-xl font-bold text-slate-900">4. Permissible Use</h2>
          <p>
            You agree not to use the Service for any unlawful purpose, including the distribution of malicious code, deceptive materials, or unauthorized copyrighted content. You remain solely responsible for any documents processed through your device.
          </p>

          <h2 className="text-xl font-bold text-slate-900">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, pdfkitfree and its operators shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use the Service, including data loss or execution errors.
          </p>
        </div>
      </div>
    </div>
  );
}
