'use client';

import React, { useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Mail, CheckCircle, Send, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccessMessage, setServerSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Feedback / Feature Request',
    message: '',
    honeypot: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setServerError(data.error || 'Failed to dispatch your inquiry. Please try again.');
        setSubmitting(false);
        return;
      }

      setServerSuccessMessage(data.message || 'Your inquiry has been successfully delivered.');
      setSubmitted(true);
    } catch (_err) {
      setServerError('A network communication error occurred. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Contact Us' }]} />

        <div className="max-w-2xl mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Contact Support & Engineering
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Have feedback on our PDF tools or want to request a new feature? We’d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Form */}
          <div className="md:col-span-7 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-600 mb-4">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Message Delivered!</h3>
                <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
                  {serverSuccessMessage || 'Thank you for reaching out. Our engineering team reviews all inquiries within 24 business hours.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setServerError(null);
                    setFormData({ name: '', email: '', subject: 'Feedback / Feature Request', message: '', honeypot: '' });
                  }}
                  className="mt-6 text-sm font-semibold text-brand-600 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {serverError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Honeypot field for bot protection (hidden from humans) */}
                <input
                  type="text"
                  name="website_trap"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.honeypot}
                  onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                  className="hidden"
                  aria-hidden="true"
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
                  >
                    <option value="Feedback / Feature Request">Feedback / Feature Request</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Enterprise / API Inquiries">Enterprise / API Inquiries</option>
                    <option value="Security Disclosure">Security Disclosure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us what you think or how we can improve PDFKitFree..."
                    disabled={submitting}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition disabled:opacity-75 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Details */}
          <div className="md:col-span-5 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Direct Inquiries</h4>
                  <p className="text-xs text-slate-600 font-medium">support@pdfkitfree.online</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                For security vulnerabilities and coordinated disclosures, reach out directly with cryptographic details.
              </p>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-900 mb-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                <span>Zero Document Ingestion</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Please do not attach actual sensitive PDF files in emails or contact forms. All troubleshooting can be conducted using sanitized sample files.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
