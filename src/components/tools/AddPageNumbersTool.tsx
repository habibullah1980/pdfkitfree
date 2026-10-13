'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  Upload, 
  File, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Trash2
} from 'lucide-react';

export function AddPageNumbersTool() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [format, setFormat] = useState<'page-x' | 'page-x-of-y'>('page-x-of-y');
  const [fontSize, setFontSize] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('numbered-document.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setDownloadUrl(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setFile(selectedFile);
      setNumPages(doc.getPageCount());
    } catch {
      setErrorMessage('Failed to read PDF document.');
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const total = doc.getPageCount();

      for (let i = 0; i < total; i++) {
        const page = doc.getPage(i);
        const { width, height } = page.getSize();
        const pageNum = i + 1;

        const text = format === 'page-x-of-y' ? `Page ${pageNum} of ${total}` : `${pageNum}`;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        let x = (width - textWidth) / 2;
        let y = 30;

        if (position === 'bottom-right') {
          x = width - textWidth - 36;
          y = 30;
        } else if (position === 'top-right') {
          x = width - textWidth - 36;
          y = height - 30;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`numbered-${file.name}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Failed to add numbers: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 sm:p-12 text-center hover:border-brand-400 hover:bg-brand-50/70 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Choose a PDF to add page numbers</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Stamp configurable page numbers across every page with custom positioning.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Select PDF File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <File className="h-6 w-6 text-brand-600" />
              <div>
                <h4 className="text-base font-semibold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">{numPages} total pages</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDownloadUrl(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as 'bottom-center' | 'bottom-right' | 'top-right')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="top-right">Top Right</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'page-x' | 'page-x-of-y')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="page-x-of-y">Page X of Y (e.g. Page 1 of {numPages})</option>
                <option value="page-x">Number Only (e.g. 1)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Font Size
              </label>
              <input
                type="number"
                min="8"
                max="18"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 10)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApply}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Numbering Pages...</span>
                </>
              ) : (
                <span>Insert Page Numbers</span>
              )}
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {downloadUrl && (
        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-6 sm:p-8 text-center animate-in fade-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm mb-3">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h4 className="text-xl font-bold text-slate-900">Page numbers added!</h4>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Numbered PDF</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
