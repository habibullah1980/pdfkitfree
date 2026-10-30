import { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy & Data Protection | PDFKitFree' },
  description:
    'Comprehensive privacy policy for PDFKitFree. Understand our client-side processing model, Google AdSense & Analytics disclosures, cookie usage, document ownership, and user privacy rights under GDPR and CCPA.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy & Data Protection | PDFKitFree',
    description: 'Learn how PDFKitFree protects your data with browser-first processing and transparent cookie disclosures.',
    url: 'https://www.pdfkitfree.online/privacy',
    type: 'website',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Privacy Policy' }]} />

        <div className="max-w-3xl mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Last Updated &amp; Effective: October 2026
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Privacy Policy &amp; Data Protection
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This Privacy Policy explains how PDFKitFree (&quot;we,&quot; &quot;our,&quot; or &quot;the Service&quot;) collects, uses, protects, and discloses information when you use our website at{' '}
            <Link href="/" className="text-brand-600 hover:underline">
              https://www.pdfkitfree.online
            </Link>.
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-8">
          {/* Executive Summary */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-5 text-sm text-teal-900">
            <p className="font-bold mb-1">Executive Summary for Users &amp; Auditors:</p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-teal-950">
              <li><strong>Client-Side First:</strong> Core PDF tools (merge, split, compress, edit, rotate, number) execute locally in your browser memory via WebAssembly and JavaScript. Your documents are not transmitted to or stored on our servers for these tools.</li>
              <li><strong>100% Document Ownership:</strong> You retain complete, unencumbered ownership and intellectual property rights over all documents and files processed.</li>
              <li><strong>No Data Brokering:</strong> We never sell, rent, or trade your personal information or document contents to data brokers.</li>
              <li><strong>Advertising &amp; Analytics:</strong> We use Google Analytics for aggregate site telemetry and display third-party advertisements via Google AdSense, which uses cookies to serve relevant ads based on prior visits. Complete opt-out instructions are detailed below.</li>
            </ul>
          </div>

          {/* Section 1 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">1. Browser-First Architecture vs. Server-Assisted Workflows</h2>
            <p className="mt-3">
              We design our tools to prioritize client-side execution whenever technically feasible:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <strong>Browser-Based PDF Tools:</strong> When utilizing tools such as Merge PDF, Split PDF, Rotate PDF, Compress PDF, Add Page Numbers, Organize Pages, and Client e-Signature, the file processing occurs entirely inside your local device memory (RAM) utilizing open-source libraries such as <code>pdf-lib</code> and <code>PDF.js</code>. The binary content of your document is never transmitted across the network to our application servers or cloud storage.
              </li>
              <li>
                <strong>Optional Server-Assisted Features:</strong> Certain specialized features require server-side compute to function. Specifically:
                <ul className="list-circle list-inside ml-5 mt-1 space-y-1">
                  <li><em>AI Document Assistant:</em> When you interact with our AI Assistant, document text extracts and prompts you explicitly submit are processed via secure server-side APIs to generate answers and summaries. These inputs are used strictly to fulfill your immediate request and are not used to train public machine learning models.</li>
                  <li><em>Multi-Party NDA eSign:</em> If you utilize our &quot;Send for Signature&quot; workflow to invite third-party signatories, the contract metadata, audit timestamps, and document hashes are securely stored on encrypted servers to enable counterparties to sign via their private expiring link.</li>
                  <li><em>Server-Assisted Video Compression:</em> If your device does not support browser hardware video transcoding, video processing may utilize ephemeral server-side compute where uploaded files are automatically purged immediately after download.</li>
                </ul>
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">2. User Ownership of Uploaded Documents &amp; Content</h2>
            <p className="mt-3">
              You retain 100% full legal ownership, copyright, and intellectual property rights to any files, PDFs, text, images, signatures, or contracts you view, edit, convert, or generate through PDFKitFree.
            </p>
            <p className="mt-2">
              We claim no ownership, license, or right over your intellectual property. Our platform only processes files to the minimum extent necessary to deliver the utility requested by you during that active session.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">3. Information We Collect</h2>
            <p className="mt-3">
              We collect information in two distinct scenarios:
            </p>
            <h3 className="text-base font-semibold text-slate-900 mt-3">A. Unregistered Website Visitors (Anonymous Usage)</h3>
            <p>
              Visitors can use all public PDF tools without creating an account or providing any personal identifying information (PII). In this mode, we collect only anonymous, aggregate technical data such as browser type, operating system, language preference, referring URL, and coarse country-level location via standard HTTP server headers for DDoS mitigation and reliability monitoring.
            </p>

            <h3 className="text-base font-semibold text-slate-900 mt-4">B. Registered Account Holders &amp; Subscribers</h3>
            <p>
              If you voluntarily choose to register an account or purchase a subscription, we collect:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Account Credentials:</strong> Email address, name, and an encrypted (hashed) password.</li>
              <li><strong>Authentication Data:</strong> Session cookies (<code>fpk_session</code>) and optional multi-factor authentication (MFA) tokens.</li>
              <li><strong>Billing &amp; Transaction Details:</strong> Subscription tier, billing cycle, and invoice history. Payment card transactions are processed directly by PCI-DSS compliant third-party payment gateways (such as PayPal or Stripe). We never store your full credit card number or CVV on our servers.</li>
              <li><strong>Support Communications:</strong> When you send a message through our Contact Us form, we collect your name, email address, inquiry subject, and message content to respond to your support ticket.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">4. Google AdSense &amp; Third-Party Advertising Disclosures</h2>
            <p className="mt-3">
              We may display advertisements provided by Google AdSense and other third-party advertising vendors to support our free utility services. In accordance with Google Publisher Policies, we disclose the following:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <strong>Third-Party Vendor Cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to our website or other websites across the Internet.
              </li>
              <li>
                <strong>Advertising Cookies:</strong> Google&apos;s use of advertising cookies (such as DoubleClick cookies) enables it and its partners to serve personalized or non-personalized ads to our visitors based on their visit to PDFKitFree and/or other sites on the Internet.
              </li>
              <li>
                <strong>Personalized Advertising Opt-Out:</strong> Users may opt out of personalized advertising by visiting Google&apos;s official Ad Settings page at:{' '}
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline font-medium">
                  https://www.google.com/settings/ads
                </a>.
              </li>
              <li>
                <strong>Network Advertising Initiative (NAI) &amp; DAA Opt-Out:</strong> Alternatively, you can opt out of a third-party vendor&apos;s use of cookies for personalized advertising by visiting the Digital Advertising Alliance Consumer Choice page at{' '}
                <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline font-medium">
                  https://optout.aboutads.info/
                </a>{' '}
                or the Network Advertising Initiative opt-out page at{' '}
                <a href="https://www.networkadvertising.org/choices/" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline font-medium">
                  https://www.networkadvertising.org/choices/
                </a>.
              </li>
            </ul>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">5. Google Analytics 4 &amp; Usage Telemetry</h2>
            <p className="mt-3">
              We use Google Analytics 4 (GA4, Measurement ID: <code>G-42VHC5N8R9</code>) to monitor aggregated traffic patterns, popular tools, page load latencies, and device compatibility.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>
                <strong>IP Anonymization:</strong> IP anonymization is permanently enabled. Google Analytics does not log or store individual IP addresses for EU visitors, and truncates IP addresses prior to processing.
              </li>
              <li>
                <strong>Zero Document Content Tracking:</strong> Our analytics configuration explicitly forbids tracking document contents, file names, signature images, passwords, or personal identity details. Telemetry tracks only page paths (e.g., <code>/tools/merge-pdf</code>) and non-sensitive interface clicks.
              </li>
              <li>
                <strong>Browser Opt-Out:</strong> You can completely prevent Google Analytics from tracking your visits across all websites by installing the official Google Analytics Opt-out Browser Add-on at:{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline font-medium">
                  https://tools.google.com/dlpage/gaoptout
                </a>.
              </li>
            </ul>
          </div>

          {/* Section 6 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">6. Cookies &amp; Local Storage Categories</h2>
            <p className="mt-3">
              Cookies are small data files stored on your browser. PDFKitFree uses cookies and HTML5 local storage strictly within the following categories:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-3 font-semibold text-slate-900">Cookie Category</th>
                    <th className="p-3 font-semibold text-slate-900">Purpose</th>
                    <th className="p-3 font-semibold text-slate-900">Can Be Disabled?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 font-medium text-slate-900">Strictly Necessary</td>
                    <td className="p-3">Session management (<code>fpk_session</code>), CSRF defense, and cookie consent preference storage.</td>
                    <td className="p-3 text-slate-500">No (essential for secure site operation)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-900">Functional &amp; UI</td>
                    <td className="p-3">Remembers user interface preferences such as active tool tabs, pagination states, and signature tool settings.</td>
                    <td className="p-3">Yes (via browser settings)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-900">Analytics (GA4)</td>
                    <td className="p-3">Aggregated pageview and performance measurements to optimize server capacity and detect broken pages.</td>
                    <td className="p-3">Yes (via Cookie Banner or GA opt-out)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-900">Advertising (AdSense)</td>
                    <td className="p-3">Third-party advertising cookies used to serve relevant or contextual advertisements.</td>
                    <td className="p-3">Yes (via Cookie Banner or Ad Settings)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">7. Data Retention &amp; Deletion Schedule</h2>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li><strong>In-Browser PDF Data:</strong> Erased instantly from device RAM when you reload, navigate away, or close your browser tab.</li>
              <li><strong>Contact Inquiries:</strong> Customer support records are retained for up to 180 days to resolve ongoing inquiries, after which they are securely archived or deleted.</li>
              <li><strong>User Account Profiles:</strong> Retained for the active lifetime of your account. Users may delete their account and associated profile records at any time through the Account Settings page or by contacting support.</li>
              <li><strong>Server Security Logs:</strong> Firewall and DDoS access logs containing truncated network headers are retained for a rolling period of up to 90 days before automated deletion.</li>
            </ul>
          </div>

          {/* Section 8 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">8. User Privacy Rights (GDPR, UK GDPR, CCPA/CPRA)</h2>
            <p className="mt-3">
              Depending on your jurisdiction, you possess statutory rights regarding your personal information under the General Data Protection Regulation (GDPR), UK Data Protection Act, and California Consumer Privacy Act as amended by the CPRA:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li><strong>Right to Access:</strong> You may request a copy of any personal data we hold about your account.</li>
              <li><strong>Right to Rectification:</strong> You may request correction of inaccurate profile data.</li>
              <li><strong>Right to Erasure (&quot;Right to Be Forgotten&quot;):</strong> You may request deletion of your account and personal details.</li>
              <li><strong>Right to Data Portability:</strong> You may request your account information in a structured, machine-readable format.</li>
              <li><strong>Right to Object &amp; Restrict Processing:</strong> You may restrict how we process your personal data.</li>
              <li><strong>Right to Non-Discrimination:</strong> We do not discriminate against users who exercise their statutory privacy rights.</li>
              <li><strong>&quot;Do Not Sell or Share My Personal Information&quot;:</strong> We do not sell user personal information to third parties.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at <a href="mailto:privacy@pdfkitfree.online" className="text-brand-600 underline">privacy@pdfkitfree.online</a>. We will respond within 30 days without charge.
            </p>
          </div>

          {/* Section 9 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">9. Children&apos;s Privacy (COPPA Compliance)</h2>
            <p className="mt-3">
              Our website and tools are directed at a general audience of professionals, students, and businesses. We do not knowingly solicit, collect, or maintain personal information from children under the age of 13 (or under 16 in the European Economic Area) in accordance with the Children&apos;s Online Privacy Protection Act (COPPA). If you believe a child has provided us with personal information, please contact us immediately so we can promptly delete it.
            </p>
          </div>

          {/* Section 10 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">10. Policy Updates &amp; Notifications</h2>
            <p className="mt-3">
              We may update this Privacy Policy periodically to reflect enhancements to our toolset, new regulatory requirements, or changes in third-party service partnerships. Significant revisions will be signaled by updating the &quot;Last Updated&quot; date at the top of this document. We encourage users to review this page periodically.
            </p>
          </div>

          {/* Section 11 */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2">11. Contact Information &amp; Data Protection Inquiries</h2>
            <p className="mt-3">
              For any questions, concerns, complaints, or formal privacy requests concerning this policy, please reach out to our dedicated privacy contact:
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm space-y-1">
              <p className="font-semibold text-slate-900">PDFKitFree Privacy &amp; Compliance Team</p>
              <p>Email: <a href="mailto:privacy@pdfkitfree.online" className="text-brand-600 hover:underline font-medium">privacy@pdfkitfree.online</a></p>
              <p>Support Inquiries: <a href="mailto:support@pdfkitfree.online" className="text-brand-600 hover:underline font-medium">support@pdfkitfree.online</a></p>
              <p>Website:{' '}
                <Link href="/" className="text-brand-600 hover:underline font-medium">
                  https://www.pdfkitfree.online
                </Link>
              </p>
              <p>Online Contact Form:{' '}
                <Link href="/contact" className="text-brand-600 hover:underline font-medium">
                  https://www.pdfkitfree.online/contact
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
