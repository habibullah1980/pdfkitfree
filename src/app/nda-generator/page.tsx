'use client';

import React, { useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { 
  FileText, 
  Copy, 
  Check, 
  Printer, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

export default function NdaGeneratorPage() {
  const [disclosingParty, setDisclosingParty] = useState('Acme Corporation');
  const [receivingParty, setReceivingParty] = useState('Beta Partners LLC');
  const [effectiveDate, setEffectiveDate] = useState('2026-10-15');
  const [governingLaw, setGoverningLaw] = useState('State of Delaware, United States');
  const [termYears, setTermYears] = useState('2');
  const [copied, setCopied] = useState(false);

  const ndaText = `MUTUAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into and made effective as of ${effectiveDate} ("Effective Date"), by and between:

Party A: ${disclosingParty}
Party B: ${receivingParty}

(Collectively referred to as the "Parties" or individually as a "Party").

1. PURPOSE
The Parties wish to explore a potential business relationship or transaction (the "Purpose"), and in connection with this Purpose, each Party may disclose to the other certain confidential and proprietary technical, commercial, or operational information.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either Party to the other, whether orally, in writing, or electronically, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information.

3. OBLIGATIONS OF RECEIVING PARTY
Each Party agrees to:
(a) Protect the disclosing Party's Confidential Information with the same degree of care it uses for its own confidential information, but in no event less than reasonable care;
(b) Restrict disclosure solely to employees, contractors, and legal/financial advisors who have a need to know and are bound by confidentiality obligations at least as restrictive as those herein;
(c) Not use Confidential Information for any purpose outside the scope of the Purpose.

4. TERM AND SURVIVAL
This Agreement shall remain in effect for a period of ${termYears} year(s) from the Effective Date. The confidentiality obligations herein shall survive termination or expiration for a period of three (3) years.

5. GOVERNING LAW
This Agreement shall be governed by, construed, and enforced in accordance with the laws of the ${governingLaw}, without regard to its conflict of law principles.

IN WITNESS WHEREOF, the Parties have executed this Mutual Non-Disclosure Agreement as of the Effective Date.

PARTY A: ${disclosingParty}
By: ____________________________________
Name: __________________________________
Title: _________________________________
Date: __________________________________

PARTY B: ${receivingParty}
By: ____________________________________
Name: __________________________________
Title: _________________________________
Date: __________________________________`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ndaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'NDA Generator' }]} />

        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Legal Agreement Builder</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Free Mutual NDA Generator
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Generate custom, professional Non-Disclosure Agreements ready to print, copy, or sign. Fast, free, and generated client-side without registration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Form */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-600" />
              <span>Agreement Details</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Disclosing Party / Party A
                </label>
                <input
                  type="text"
                  value={disclosingParty}
                  onChange={(e) => setDisclosingParty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Receiving Party / Party B
                </label>
                <input
                  type="text"
                  value={receivingParty}
                  onChange={(e) => setReceivingParty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Term Duration
                  </label>
                  <select
                    value={termYears}
                    onChange={(e) => setTermYears(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Governing Jurisdiction
                </label>
                <input
                  type="text"
                  value={governingLaw}
                  onChange={(e) => setGoverningLaw(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs text-teal-800 bg-teal-50 p-3 rounded-lg border border-teal-200">
                  <ShieldCheck className="h-4 w-4 text-teal-600 flex-shrink-0" />
                  <span>No data is stored on our servers. Your contracts are rendered locally in your browser.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Agreement Preview & Actions */}
          <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-5 py-3 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Live Agreement Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-teal-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap max-h-[600px] overflow-y-auto leading-relaxed selection:bg-brand-500 selection:text-white">
              {ndaText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
