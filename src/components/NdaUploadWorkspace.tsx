'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { SharedSignerWorkspace } from './SharedSignerWorkspace';
import { Upload, FileText, AlertCircle, Lock } from 'lucide-react';

export function NdaUploadWorkspace() {
  const [fileArrayBuffer, setFileArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);

    const isPdf =
      selectedFile.type === 'application/pdf' ||
      selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Please upload a valid PDF document (.pdf).');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMessage('File exceeds the 50 MB limit. Please select a smaller PDF.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();

      // Verify integrity with pdf-lib
      let loadedDoc: PDFDocument;
      try {
        loadedDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      } catch (err: unknown) {
        const errObj = err as Error;
        if (errObj.message && errObj.message.toLowerCase().includes('encrypt')) {
          setErrorMessage('This PDF document is encrypted. Please decrypt or unlock it before uploading.');
          return;
        }
        setErrorMessage('Unable to open PDF. File may be corrupted.');
        return;
      }

      if (loadedDoc.getPageCount() === 0) {
        setErrorMessage('The uploaded PDF contains no pages.');
        return;
      }

      setFileArrayBuffer(buffer);
      setFileName(selectedFile.name);
    } catch {
      setErrorMessage('Failed to read PDF file. Please try again.');
    }
  };

  const handleReset = () => {
    setFileArrayBuffer(null);
    setFileName('');
    setErrorMessage(null);
  };

  if (fileArrayBuffer) {
    return (
      <SharedSignerWorkspace
        pdfArrayBuffer={fileArrayBuffer}
        documentTitle={fileName}
        fileName={fileName}
        documentType="uploaded"
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
          <Upload className="h-8 w-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900">
          Upload Existing NDA Document
        </h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md">
          Drag and drop your signed or unsigned non-disclosure agreement in PDF format. Supports multi-page agreements up to 50 MB.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
          >
            <FileText className="h-4 w-4" />
            <span>Select PDF Document</span>
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
          <span>Client-Side Isolation: Document is processed locally in browser RAM</span>
        </div>
      </div>
    </div>
  );
}
