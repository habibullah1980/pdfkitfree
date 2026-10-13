'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SignatureCreator } from '@/components/SignatureCreator';
import { PdfViewerAndSigner } from '@/components/PdfViewerAndSigner';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  Eye,
  Loader2
} from 'lucide-react';

interface SignaturePlacementConfig {
  pageNumber: number;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  includeDate: boolean;
  dateText: string;
  includeInitials: boolean;
  initialsText: string;
}

export default function NdaSignerPage() {
  // Step workflow: 1 = Upload, 2 = Preview & Page Select, 3 = Create Signature, 4 = Position, 5 = Review & Download
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Uploaded Document state
  const [fileArrayBuffer, setFileArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [placementConfig, setPlacementConfig] = useState<SignaturePlacementConfig | null>(null);

  // Signed Result state
  const [isGenerating, setIsGenerating] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedDownloadName, setSignedDownloadName] = useState<string>('signed-nda.pdf');

  // Format bytes
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 1. Handle File Upload & Validation
  const handleFileUpload = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);

    // Validate type
    const isPdf =
      selectedFile.type === 'application/pdf' ||
      selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Invalid file format. Please upload a standard PDF document (.pdf).');
      return;
    }

    // Validate size (max 50 MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMessage('File exceeds the 50 MB maximum size limit. Please select a smaller PDF.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();

      // Validate integrity and inspect page count using pdf-lib
      let loadedDoc: PDFDocument;
      try {
        loadedDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      } catch (err: unknown) {
        const errObj = err as Error;
        if (errObj.message && errObj.message.toLowerCase().includes('encrypt')) {
          setErrorMessage('This PDF document is encrypted or password-protected. Please remove the password before uploading.');
          return;
        }
        setErrorMessage('Unable to open PDF. The file may be corrupted or damaged.');
        return;
      }

      const pages = loadedDoc.getPageCount();
      if (pages === 0) {
        setErrorMessage('The selected PDF contains no pages.');
        return;
      }

      setFileArrayBuffer(buffer);
      setFileName(selectedFile.name);
      setFileSize(selectedFile.size);
      setNumPages(pages);
      setCurrentPage(1);

      // Clean download name
      const base = selectedFile.name.replace(/\.[^/.]+$/, '');
      setSignedDownloadName(`signed-${base}.pdf`);

      setActiveStep(2);
    } catch {
      setErrorMessage('Failed to read document. Please select a valid PDF file.');
    }
  };

  // Reset entire workflow & wipe memory
  const handleResetWorkflow = () => {
    if (signedPdfUrl) {
      URL.revokeObjectURL(signedPdfUrl);
    }
    setFileArrayBuffer(null);
    setFileName('');
    setFileSize(0);
    setNumPages(0);
    setCurrentPage(1);
    setSignatureDataUrl(null);
    setPlacementConfig(null);
    setSignedPdfUrl(null);
    setErrorMessage(null);
    setActiveStep(1);
  };

  // 4. Embed Signature into PDF using pdf-lib
  const handleGenerateSignedPdf = async () => {
    if (!fileArrayBuffer || !signatureDataUrl || !placementConfig) {
      setErrorMessage('Please ensure a signature has been created and positioned on the document.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // Load source PDF
      const pdfDoc = await PDFDocument.load(fileArrayBuffer);
      const targetPage = pdfDoc.getPage(placementConfig.pageNumber - 1);
      const { width: pageWidth, height: pageHeight } = targetPage.getSize();

      // Embed signature image (PNG or JPG)
      let embeddedImage;
      if (signatureDataUrl.startsWith('data:image/jpeg') || signatureDataUrl.startsWith('data:image/jpg')) {
        embeddedImage = await pdfDoc.embedJpg(signatureDataUrl);
      } else {
        embeddedImage = await pdfDoc.embedPng(signatureDataUrl);
      }

      // Calculate coordinates:
      // Note: In PDF coordinates, origin (0,0) is bottom-left.
      // In our viewer, normY is measured from the top (0 at top, 1 at bottom).
      const drawWidth = placementConfig.normWidth * pageWidth;
      const drawHeight = placementConfig.normHeight * pageHeight;
      const drawX = placementConfig.normX * pageWidth;
      const drawY = pageHeight - (placementConfig.normY * pageHeight + drawHeight);

      // Draw the signature
      targetPage.drawImage(embeddedImage, {
        x: drawX,
        y: Math.max(10, drawY),
        width: drawWidth,
        height: drawHeight,
      });

      // Embed Font for Date and Initials if requested
      if (placementConfig.includeDate || placementConfig.includeInitials) {
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 9;

        if (placementConfig.includeDate) {
          targetPage.drawText(`Date: ${placementConfig.dateText}`, {
            x: drawX,
            y: Math.max(2, drawY - 12),
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2),
          });
        }

        if (placementConfig.includeInitials) {
          targetPage.drawText(`Initials: ${placementConfig.initialsText}`, {
            x: drawX + drawWidth - 65,
            y: Math.max(2, drawY - 12),
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2),
          });
        }
      }

      // Save merged bytes
      const signedBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(signedBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setSignedPdfUrl(url);
      setActiveStep(5);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(`Failed to generate signed document: ${errObj.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'NDA Generator', href: '/nda-generator' }, { label: 'Upload & Sign Document' }]} />

        {/* Header Banner */}
        <div className="max-w-4xl mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-3">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Zero Server Transmission: Document remains in browser RAM</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Upload & Digitally Sign NDA Document
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Sign non-disclosure agreements, contracts, or consent forms with customized electronic signatures, audit stamps, and complete client-side confidentiality.
          </p>
        </div>

        {/* 5-Step Progress Indicator */}
        <div className="mb-10 overflow-x-auto pb-2">
          <div className="flex items-center min-w-[620px] justify-between border-b border-slate-200 pb-4">
            {[
              { num: 1, title: 'Upload NDA' },
              { num: 2, title: 'Preview Document' },
              { num: 3, title: 'Create Signature' },
              { num: 4, title: 'Place Signature' },
              { num: 5, title: 'Review & Download' },
            ].map((step) => {
              const isCurrent = activeStep === step.num;
              const isPast = activeStep > step.num;
              return (
                <div key={step.num} className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent
                        ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                        : isPast
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPast ? <CheckCircle className="h-4 w-4" /> : step.num}
                  </span>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      isCurrent
                        ? 'text-brand-900 font-bold'
                        : isPast
                        ? 'text-teal-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.num < 5 && <div className="h-0.5 w-6 sm:w-10 bg-slate-200 ml-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: UPLOAD NDA OR PDF DOCUMENT */}
        {/* ============================================================ */}
        {activeStep === 1 && (
          <div className="max-w-3xl mx-auto">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-10 sm:p-14 text-center transition hover:border-brand-400 hover:bg-brand-50/70"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
                <Upload className="h-8 w-8" />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Upload your NDA or PDF Agreement
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-md">
                Drag and drop your PDF here, or select a file from your device. Supports standard non-disclosure agreements and contracts up to 50 MB.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
                >
                  <FileText className="h-4 w-4" />
                  <span>Choose PDF Document</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-teal-800 bg-teal-50 px-4 py-1.5 rounded-full border border-teal-200">
                <Lock className="h-3.5 w-3.5 text-teal-600" />
                <span>Client-Side Isolation: Uploaded files are never transmitted to external APIs</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2, 3, 4: DOCUMENT WORKSPACE */}
        {/* ============================================================ */}
        {activeStep >= 2 && activeStep <= 4 && fileArrayBuffer && (
          <div className="space-y-8">
            {/* Document Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-brand-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                    {fileName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {numPages} {numPages === 1 ? 'Page' : 'Pages'} • {formatFileSize(fileSize)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetWorkflow}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Upload Different File</span>
                </button>
              </div>
            </div>

            {/* Workflow controls bar based on current sub-step */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {activeStep === 2 && 'Step 2: Preview Document & Choose Signing Page'}
                  {activeStep === 3 && 'Step 3: Create or Select Your Electronic Signature'}
                  {activeStep === 4 && 'Step 4: Position Signature on Page'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeStep === 2 && 'Inspect pages and verify content before applying your signature.'}
                  {activeStep === 3 && 'Draw with pen, type cursive font, or upload a transparent signature graphic.'}
                  {activeStep === 4 && 'Drag and resize the signature box directly on the document canvas.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                  >
                    <span>Proceed to Create Signature</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {activeStep === 3 && signatureDataUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                  >
                    <span>Position on Document</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {activeStep === 4 && (
                  <button
                    type="button"
                    disabled={isGenerating || !signatureDataUrl}
                    onClick={handleGenerateSignedPdf}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Embedding Signature...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Sign Document Now</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Signature Creator Panel for Step 3 */}
            {activeStep === 3 && (
              <SignatureCreator
                onSignatureReady={(dataUrl) => {
                  setSignatureDataUrl(dataUrl);
                  setActiveStep(4);
                }}
              />
            )}

            {/* In-Browser PDF.js Viewer & Drag-Placement Workspace (Rendered on Step 2 & Step 4) */}
            {(activeStep === 2 || activeStep === 4) && (
              <PdfViewerAndSigner
                pdfArrayBuffer={fileArrayBuffer}
                numPages={numPages}
                currentPage={currentPage}
                onPageChange={(page) => setCurrentPage(page)}
                signatureImage={activeStep === 4 ? signatureDataUrl : null}
                onPlaceSignature={(config) => {
                  setPlacementConfig(config);
                }}
              />
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 5: REVIEW & DOWNLOAD SIGNED PDF */}
        {/* ============================================================ */}
        {activeStep === 5 && signedPdfUrl && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-teal-200 bg-teal-50/60 p-8 sm:p-12 text-center animate-in fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm mb-4">
              <CheckCircle className="h-10 w-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              Document Signed Successfully!
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Your electronic signature, page layout, and document structure have been consolidated into a finalized PDF.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href={signedPdfUrl}
                download={signedDownloadName}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow hover:bg-brand-700 transition"
              >
                <Download className="h-5 w-5" />
                <span>Download Signed PDF</span>
              </a>

              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Eye className="h-4 w-4" />
                <span>Open Preview in New Tab</span>
              </a>

              <button
                type="button"
                onClick={handleResetWorkflow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Sign Another Document</span>
              </button>
            </div>

            <div className="mt-8 rounded-lg bg-white/80 p-4 border border-teal-100 text-left text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">Document Processing Notice:</p>
              <p>• Output filename: <code className="font-mono text-teal-800">{signedDownloadName}</code></p>
              <p>• Signature applied on page {placementConfig?.pageNumber || currentPage} of {numPages}</p>
              <p>• Client-side isolated execution: No copies stored or retained</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
