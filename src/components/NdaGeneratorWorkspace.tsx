'use client';

import React, { useState, useMemo } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SharedSignerWorkspace } from './SharedSignerWorkspace';
import { 
  Download, 
  ArrowRight, 
  AlertCircle, 
  Edit3, 
  FileCheck2, 
  Building2, 
  Scale, 
  Loader2
} from 'lucide-react';

type NdaType = 'mutual' | 'unilateral';

interface NdaFormState {
  ndaType: NdaType;
  disclosingCompany: string;
  disclosingSigner: string;
  disclosingTitle: string;
  disclosingAddress: string;
  receivingCompany: string;
  receivingSigner: string;
  receivingTitle: string;
  receivingAddress: string;
  effectiveDate: string;
  duration: string;
  purpose: string;
  jurisdiction: string;
  includeNonSolicitation: boolean;
  includeInjunctiveRelief: boolean;
}

export function NdaGeneratorWorkspace() {
  const [form, setForm] = useState<NdaFormState>({
    ndaType: 'mutual',
    disclosingCompany: 'Acme Software Solutions Inc.',
    disclosingSigner: 'Alex Mercer',
    disclosingTitle: 'Chief Executive Officer',
    disclosingAddress: '500 Tech Blvd, Suite 300, San Francisco, CA 94105',
    receivingCompany: 'Beta Ventures Capital LLC',
    receivingSigner: 'David Miller',
    receivingTitle: 'Managing Partner',
    receivingAddress: '740 Madison Ave, Floor 18, New York, NY 10065',
    effectiveDate: new Date().toISOString().split('T')[0],
    duration: '2 Years',
    purpose: 'Evaluating a potential strategic business relationship, technology integration, and prospective investment opportunity.',
    jurisdiction: 'State of Delaware',
    includeNonSolicitation: true,
    includeInjunctiveRelief: true,
  });

  // Custom editable text override
  const [isCustomEditing, setIsCustomEditing] = useState<boolean>(false);
  const [customAgreementText, setCustomAgreementText] = useState<string>('');

  // Transition to Signing workflow
  const [generatedPdfBuffer, setGeneratedPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPreparingSign, setIsPreparingSign] = useState<boolean>(false);

  // Generate agreement text
  const defaultAgreementText = useMemo(() => {
    const isMutual = form.ndaType === 'mutual';
    const title = isMutual ? 'MUTUAL NON-DISCLOSURE AGREEMENT' : 'UNILATERAL NON-DISCLOSURE AGREEMENT';

    return `${title}

This Non-Disclosure Agreement (the "Agreement") is entered into and made effective as of ${form.effectiveDate} (the "Effective Date"), by and between:

DISCLOSING PARTY:
${form.disclosingCompany}, having an address at ${form.disclosingAddress} (represented by ${form.disclosingSigner}, ${form.disclosingTitle}).

AND RECEIVING PARTY:
${form.receivingCompany}, having an address at ${form.receivingAddress} (represented by ${form.receivingSigner}, ${form.receivingTitle}).

${isMutual ? 'The parties may mutually disclose and receive confidential information hereunder.' : 'The Disclosing Party agrees to disclose, and the Receiving Party agrees to receive, confidential information under the terms set forth herein.'}

1. PURPOSE OF DISCLOSURE
The parties wish to explore and engage in discussions concerning: ${form.purpose} (the "Permitted Purpose").

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" refers to any proprietary information, technical data, trade secrets, software code, financial figures, customer lists, business plans, or strategic roadmaps disclosed by one party to the other, whether orally, in writing, or electronically, and designated as confidential or which reasonably should be understood to be confidential given the nature of the information.

3. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party agrees:
(a) To protect and safeguard the confidentiality of the Disclosing Party’s Confidential Information with the same degree of care it exercises for its own confidential material, but not less than reasonable care;
(b) Not to disclose, publish, or disseminate Confidential Information to any third party without prior written authorization;
(c) To restrict disclosure exclusively to employees, officers, and legal advisors who have a strict need-to-know to fulfill the Permitted Purpose and who are bound by non-disclosure agreements at least as restrictive as this Agreement.

4. EXCLUSIONS FROM CONFIDENTIALITY
Confidential Information does not include information that:
(a) Is or becomes publicly known through no breach of this Agreement;
(b) Was already lawfully in the possession of the Receiving Party prior to disclosure;
(c) Is independently developed by the Receiving Party without reference to or reliance on Confidential Information;
(d) Is required to be disclosed pursuant to judicial order or applicable statute, provided prompt written notice is delivered to the Disclosing Party.

5. TERM AND DURATION
The confidentiality obligations under this Agreement shall remain in full force and effect for a term of ${form.duration} from the Effective Date, or until such time as the Confidential Information ceases to be proprietary or enters the public domain through lawful means.

${form.includeNonSolicitation ? `6. NON-SOLICITATION
During the term of this Agreement and for twelve (12) months following its termination, neither party shall directly solicit for employment or hire any key employee or contractor of the other party introduced in connection with the Permitted Purpose without prior written consent.\n\n` : ''}${form.includeInjunctiveRelief ? `7. INJUNCTIVE RELIEF
The parties acknowledge that an unauthorized disclosure or breach of this Agreement may cause irreparable harm for which monetary damages alone would be inadequate. Accordingly, the Disclosing Party shall be entitled to seek injunctive relief and equitable remedies in any court of competent jurisdiction without the requirement of posting a bond.\n\n` : ''}8. GOVERNING LAW AND JURISDICTION
This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of the ${form.jurisdiction}, without giving effect to conflict of laws principles.

9. ENTIRE AGREEMENT AND EXECUTION
This Agreement constitutes the entire understanding between the parties regarding the subject matter hereof and supersedes all prior representations. This Agreement may be executed in counterparts and via electronic signature, each of which shall be deemed an original binding legal instrument.

IN WITNESS WHEREOF, the parties hereto have executed this Non-Disclosure Agreement as of the Effective Date.

DISCLOSING PARTY: ${form.disclosingCompany}
By: ___________________________
Name: ${form.disclosingSigner}
Title: ${form.disclosingTitle}
Date: _________________________

RECEIVING PARTY: ${form.receivingCompany}
By: ___________________________
Name: ${form.receivingSigner}
Title: ${form.receivingTitle}
Date: _________________________`;
  }, [form]);

  const activeText = isCustomEditing ? customAgreementText : defaultAgreementText;

  // Generate PDF from text helper
  const createPdfDocument = async (): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const textToPrint = activeText;
    const lines = textToPrint.split('\n');

    let page = pdfDoc.addPage([612, 792]); // Standard US Letter (8.5 x 11 inches)
    const margin = 50;
    const pageWidth = 612 - margin * 2;
    let yPosition = 740;
    const lineHeight = 14;

    // Header disclaimer
    page.drawText('FREEPDFKIT STANDARD AGREEMENT TEMPLATE • CLIENT-SIDE GENERATED', {
      x: margin,
      y: 760,
      size: 7,
      font: timesBold,
      color: rgb(0.5, 0.5, 0.5),
    });

    for (const rawLine of lines) {
      if (yPosition < 60) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = 740;
        page.drawText('FREEPDFKIT STANDARD AGREEMENT TEMPLATE • CLIENT-SIDE GENERATED', {
          x: margin,
          y: 760,
          size: 7,
          font: timesBold,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      if (!rawLine.trim()) {
        yPosition -= 8;
        continue;
      }

      const isHeader =
        rawLine.startsWith('MUTUAL') ||
        rawLine.startsWith('UNILATERAL') ||
        rawLine.includes('DISCLOSING PARTY:') ||
        rawLine.includes('RECEIVING PARTY:') ||
        /^[0-9]+\.\s/.test(rawLine);

      const font = isHeader ? timesBold : timesRoman;
      const size = rawLine.startsWith('MUTUAL') || rawLine.startsWith('UNILATERAL') ? 13 : isHeader ? 10 : 9.5;

      // Simple word wrapping
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, size);

        if (textWidth > pageWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
          yPosition -= lineHeight;
          currentLine = word;

          if (yPosition < 60) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = 740;
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        yPosition -= lineHeight;
      }
    }

    return await pdfDoc.save();
  };

  // Direct Download PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const pdfBytes = await createPdfDocument();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.ndaType}-nda-${form.disclosingCompany.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF agreement.');
    } finally {
      setIsExporting(false);
    }
  };

  // Transition to Signing Workflow
  const handleProceedToSign = async () => {
    setIsPreparingSign(true);
    try {
      const pdfBytes = await createPdfDocument();
      setGeneratedPdfBuffer(pdfBytes.buffer as ArrayBuffer);
    } catch (err) {
      console.error('Error preparing PDF for sign:', err);
      alert('Failed to prepare document for signing.');
    } finally {
      setIsPreparingSign(false);
    }
  };

  if (generatedPdfBuffer) {
    return (
      <SharedSignerWorkspace
        pdfArrayBuffer={generatedPdfBuffer}
        documentTitle={`${form.ndaType === 'mutual' ? 'Mutual' : 'One-Way'} NDA — ${form.disclosingCompany}`}
        fileName={`${form.ndaType}-nda.pdf`}
        documentType="generated"
        disclosingParty={form.disclosingCompany}
        receivingParty={form.receivingCompany}
        onReset={() => setGeneratedPdfBuffer(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Template Type Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Choose NDA Template Type</h3>
          <p className="text-xs text-slate-500">
            Select unilateral or mutual protection structure.
          </p>
        </div>

        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, ndaType: 'mutual' }))}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
              form.ndaType === 'mutual'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mutual NDA (Bilateral)
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, ndaType: 'unilateral' }))}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
              form.ndaType === 'unilateral'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            One-Way NDA (Unilateral)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Controls Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* Disclosing Party Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 className="h-4 w-4 text-brand-600" />
              <span>Disclosing Party</span>
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Company / Entity Name
              </label>
              <input
                type="text"
                value={form.disclosingCompany}
                onChange={(e) => setForm({ ...form, disclosingCompany: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Representative Name
                </label>
                <input
                  type="text"
                  value={form.disclosingSigner}
                  onChange={(e) => setForm({ ...form, disclosingSigner: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Representative Title
                </label>
                <input
                  type="text"
                  value={form.disclosingTitle}
                  onChange={(e) => setForm({ ...form, disclosingTitle: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Street Address &amp; Jurisdiction
              </label>
              <input
                type="text"
                value={form.disclosingAddress}
                onChange={(e) => setForm({ ...form, disclosingAddress: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Receiving Party Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>Receiving Party</span>
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Company / Entity Name
              </label>
              <input
                type="text"
                value={form.receivingCompany}
                onChange={(e) => setForm({ ...form, receivingCompany: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Representative Name
                </label>
                <input
                  type="text"
                  value={form.receivingSigner}
                  onChange={(e) => setForm({ ...form, receivingSigner: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Representative Title
                </label>
                <input
                  type="text"
                  value={form.receivingTitle}
                  onChange={(e) => setForm({ ...form, receivingTitle: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Street Address &amp; Jurisdiction
              </label>
              <input
                type="text"
                value={form.receivingAddress}
                onChange={(e) => setForm({ ...form, receivingAddress: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Agreement Terms */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Scale className="h-4 w-4 text-brand-600" />
              <span>Agreement Terms &amp; Jurisdiction</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Confidentiality Term
                </label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3 Years">3 Years</option>
                  <option value="5 Years">5 Years</option>
                  <option value="Indefinite / Perpetual">Perpetual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Governing Law / Jurisdiction
              </label>
              <select
                value={form.jurisdiction}
                onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="State of Delaware">State of Delaware</option>
                <option value="State of California">State of California</option>
                <option value="State of New York">State of New York</option>
                <option value="State of Texas">State of Texas</option>
                <option value="England and Wales">England and Wales</option>
                <option value="Province of Ontario, Canada">Ontario, Canada</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Purpose of Disclosure
              </label>
              <textarea
                rows={2}
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="pt-1 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.includeNonSolicitation}
                  onChange={(e) => setForm({ ...form, includeNonSolicitation: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Include Non-Solicitation Clause (12 Months)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.includeInjunctiveRelief}
                  onChange={(e) => setForm({ ...form, includeInjunctiveRelief: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Include Injunctive Relief Clause</span>
              </label>
            </div>
          </div>
        </div>

        {/* Agreement Preview & Actions Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileCheck2 className="h-4 w-4 text-brand-600" />
              <span>Agreement Preview &amp; Editor</span>
            </h4>

            <button
              type="button"
              onClick={() => {
                if (!isCustomEditing) {
                  setCustomAgreementText(defaultAgreementText);
                }
                setIsCustomEditing(!isCustomEditing);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isCustomEditing ? 'Switch to Form View' : 'Edit Agreement Text Directly'}</span>
            </button>
          </div>

          {/* Legal Disclaimer Alert */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Legal Disclaimer:</strong> This agreement template is provided for general business informational and preparation purposes only and does not constitute formal legal advice. Contract requirements and enforceability vary across jurisdictions. You should consult a licensed attorney for custom legal counsel.
            </p>
          </div>

          {/* Text preview box */}
          <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm max-h-[500px] overflow-y-auto">
            {isCustomEditing ? (
              <textarea
                rows={22}
                value={customAgreementText}
                onChange={(e) => setCustomAgreementText(e.target.value)}
                className="w-full font-mono text-xs text-slate-800 bg-slate-50/70 p-3 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            ) : (
              <pre className="font-serif text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {defaultAgreementText}
              </pre>
            )}
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Exporting PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export Agreement as PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isPreparingSign}
              onClick={handleProceedToSign}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow hover:bg-teal-700 transition disabled:opacity-50"
            >
              {isPreparingSign ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading Signer...</span>
                </>
              ) : (
                <>
                  <span>Continue to eSign Document</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
