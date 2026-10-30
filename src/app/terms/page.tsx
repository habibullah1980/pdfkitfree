import { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: { absolute: 'Terms of Service | PDFKitFree' },
  description:
    'Terms and conditions governing the use of the PDFKitFree online document tools, video compressor, and electronic signature utilities. Learn about document ownership, acceptable use, and service boundaries.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service | PDFKitFree',
    description: 'Usage policies, document ownership rights, and terms of service for PDFKitFree.',
    url: 'https://www.pdfkitfree.online/terms',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Terms of Service' }]} />

        <div className="max-w-3xl mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Last Updated &amp; Effective: October 2026
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please read these Terms of Service (&quot;Terms&quot;) carefully before using the PDFKitFree website and services operated by PDFKitFree (&quot;we,&quot; &quot;our,&quot; or &quot;the Service&quot;) at{' '}
            <Link href="/" className="text-brand-600 hover:underline">
              https://www.pdfkitfree.online
            </Link>.
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-8">
          {/* Section 1 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing, browsing, or using PDFKitFree, you agree to be bound by these Terms and our Privacy Policy. If you disagree with any part of these terms, you must discontinue your use of the Service immediately.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">2. Description of the Service</h2>
            <p className="mt-3">
              PDFKitFree is a specialized online productivity platform providing:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><strong>Browser-Based PDF Utilities:</strong> Tools to merge, split, compress, edit, rotate, number, crop, watermark, redact, convert, and inspect PDF documents locally in your browser.</li>
              <li><strong>Electronic Signature Workflows:</strong> Tools to draw, type, and embed electronic signatures onto PDF documents.</li>
              <li><strong>Document Generation:</strong> Standardized agreement templates (including mutual and unilateral NDAs).</li>
              <li><strong>Media Tools:</strong> Client-side video compression utilities.</li>
              <li><strong>Optional Account Features:</strong> Optional user accounts, subscription tiers, and server-assisted AI document summarization.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">3. User Ownership &amp; Intellectual Property Rights</h2>
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-950 font-medium">
              Important: You retain 100% exclusive intellectual property rights and full legal ownership over every document, image, signature, file, and text element you process or create using PDFKitFree.
            </div>
            <p className="mt-3">
              We claim no ownership, copyright, or licensing interest in your files. Our platform acts solely as a technological tool running in your browser to execute the transformations you command.
            </p>
            <p className="mt-2">
              The PDFKitFree brand name, logo, website interface, custom code, graphic design, and software documentation are the proprietary intellectual property of PDFKitFree and are protected by applicable trademark and copyright laws.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">4. Legal Disclaimers &amp; No Legal Advice</h2>
            <p className="mt-3">
              The contract templates provided on PDFKitFree (such as the Mutual Non-Disclosure Agreement generator and freelance agreement builder) are provided for general informational and administrative convenience purposes only.
            </p>
            <p className="mt-2">
              PDFKitFree is not a law firm, does not provide legal representation, and does not provide formal legal advice. Laws regarding contract formation, non-disclosure agreements, and electronic signatures vary by jurisdiction. We do not guarantee that generated documents will be enforceable or appropriate for your specific factual scenario. Always consult qualified legal counsel for critical legal and corporate agreements.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">5. Permissible &amp; Acceptable Use Policy</h2>
            <p className="mt-3">
              You agree not to use PDFKitFree:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li>To process, distribute, or create documents containing malicious software, viruses, malware, or exploit payloads.</li>
              <li>To forge signatures, commit fraud, impersonate another individual, or misrepresent authority to execute legal agreements.</li>
              <li>To infringe upon the copyright, patent, trademark, trade secret, or other proprietary rights of any third party.</li>
              <li>To launch automated bot attacks, denial-of-service (DDoS) requests, scraping scripts, or security probes against our server infrastructure.</li>
              <li>In any manner that violates local, national, or international laws and regulations.</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">6. Subscription Terms, Billing &amp; Cancellations</h2>
            <p className="mt-3">
              While our core PDF utilities are provided free of charge, premium tiers (such as Pro and Business) offer elevated processing quotas and server-assisted AI features:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><strong>Billing:</strong> Subscriptions are billed in advance on a recurring monthly or annual basis via authorized PCI-compliant payment processors.</li>
              <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your Account Settings. Upon cancellation, you retain access through the end of your current paid billing period.</li>
              <li><strong>Refund Policy:</strong> If you experience technical defects preventing the use of premium features, contact our support within 14 days of purchase for a prompt review and refund.</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">7. Disclaimer of Warranties</h2>
            <p className="mt-3">
              PDFKitFree is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
            <p className="mt-2">
              We do not warrant that our service will be uninterrupted, error-free, completely bug-free, or compatible with every possible corrupted, encrypted, or proprietary PDF variant. Users are strongly advised to keep independent backup copies of all original documents before applying digital edits or conversions.
            </p>
          </div>

          {/* Section 8 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">8. Limitation of Liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by applicable law, in no event shall PDFKitFree, its operators, employees, affiliates, or licensors be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, goodwill, or other intangible losses resulting from:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li>Your access to, use of, or inability to access or use the Service;</li>
              <li>Any document formatting discrepancy, file corruption, or loss of data during browser processing;</li>
              <li>Any unauthorized access to or alteration of your transmissions or documents.</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">9. Modifications to the Terms</h2>
            <p className="mt-3">
              We reserve the right to revise or replace these Terms at any time. When modifications occur, we will revise the &quot;Last Updated&quot; date at the top of this page. Your continued use of the website after any revisions constitutes your acceptance of the updated Terms.
            </p>
          </div>

          {/* Section 10 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">10. Contact Us Regarding These Terms</h2>
            <p className="mt-3">
              If you have any questions or legal inquiries regarding these Terms of Service, please contact us at:
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
              <p className="font-semibold text-slate-900">PDFKitFree Legal &amp; Support Team</p>
              <p>Email: <a href="mailto:support@pdfkitfree.online" className="text-brand-600 hover:underline">support@pdfkitfree.online</a></p>
              <p>Privacy Inquiries: <a href="mailto:privacy@pdfkitfree.online" className="text-brand-600 hover:underline">privacy@pdfkitfree.online</a></p>
              <p>Online Form: <Link href="/contact" className="text-brand-600 hover:underline">https://www.pdfkitfree.online/contact</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
