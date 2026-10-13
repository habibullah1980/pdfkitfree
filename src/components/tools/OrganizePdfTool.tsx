'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Upload, 
  Trash2, 
  File, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Check
} from 'lucide-react';

interface OrganizePdfToolProps {
  mode: 'remove' | 'extract' | 'organize';
}

export function OrganizePdfTool({ mode }: OrganizePdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<{ id: string; originalIndex: number; selected: boolean }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('organized.pdf');
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
      const count = doc.getPageCount();
      setFile(selectedFile);
      setPages(
        Array.from({ length: count }, (_, i) => ({
          id: `p-${i}-${Math.random()}`,
          originalIndex: i,
          selected: mode === 'remove' ? false : true,
        }))
      );
    } catch {
      setErrorMessage('Failed to open PDF document.');
    }
  };

  const togglePageSelection = (index: number) => {
    setPages((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const movePage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pages.length) return;
    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    setPages(newPages);
  };

  const handleExecute = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      let targetOriginalIndices: number[] = [];

      if (mode === 'remove') {
        // Keep pages where selected is false (selected = marked for removal)
        targetOriginalIndices = pages.filter((p) => !p.selected).map((p) => p.originalIndex);
      } else if (mode === 'extract') {
        // Keep pages where selected is true
        targetOriginalIndices = pages.filter((p) => p.selected).map((p) => p.originalIndex);
      } else {
        // 'organize': keep all in current reordered sequence
        targetOriginalIndices = pages.map((p) => p.originalIndex);
      }

      if (targetOriginalIndices.length === 0) {
        setErrorMessage('Cannot generate an empty PDF document. Please keep at least 1 page.');
        setIsProcessing(false);
        return;
      }

      const copied = await newDoc.copyPages(srcDoc, targetOriginalIndices);
      copied.forEach((p) => newDoc.addPage(p));

      const bytes = await newDoc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      const base = file.name.replace(/\.[^/.]+$/, '');
      if (mode === 'remove') setDownloadName(`${base}-pages-removed.pdf`);
      else if (mode === 'extract') setDownloadName(`${base}-extracted.pdf`);
      else setDownloadName(`${base}-reordered.pdf`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Processing failed: ${error.message}`);
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
          <h3 className="text-xl font-bold text-slate-900">
            {mode === 'remove' && 'Choose a PDF to remove pages from'}
            {mode === 'extract' && 'Choose a PDF to extract pages from'}
            {mode === 'organize' && 'Choose a PDF to reorder and organize'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Click to upload or drag and drop your document.
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
                <p className="text-xs text-slate-500">
                  {pages.length} total pages •{' '}
                  {mode === 'remove' && 'Click a page thumbnail to mark for removal'}
                  {mode === 'extract' && 'Select the pages you wish to keep'}
                  {mode === 'organize' && 'Use Left / Right controls to rearrange sequence'}
                </p>
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

          {/* Thumbnail list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-2 border rounded-lg bg-slate-50">
            {pages.map((p, idx) => {
              const isMarked = mode === 'remove' ? p.selected : !p.selected;
              return (
                <div
                  key={p.id}
                  onClick={() => mode !== 'organize' && togglePageSelection(idx)}
                  className={`flex flex-col items-center p-3 rounded-lg border transition cursor-pointer select-none ${
                    isMarked
                      ? 'border-red-300 bg-red-50/50 opacity-60'
                      : 'border-brand-200 bg-white shadow-xs'
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-600 mb-1">
                    Page {p.originalIndex + 1}
                  </span>
                  <div className="w-16 h-22 border border-slate-200 bg-slate-100 flex items-center justify-center rounded text-xs font-bold text-slate-700">
                    P.{p.originalIndex + 1}
                  </div>

                  {mode === 'remove' && (
                    <span className={`mt-2 text-[10px] font-bold ${p.selected ? 'text-red-600' : 'text-slate-400'}`}>
                      {p.selected ? 'To Delete' : 'Keep'}
                    </span>
                  )}

                  {mode === 'extract' && (
                    <span className={`mt-2 text-[10px] font-bold flex items-center gap-0.5 ${p.selected ? 'text-teal-600' : 'text-slate-400'}`}>
                      {p.selected && <Check className="h-3 w-3" />}
                      {p.selected ? 'Extract' : 'Ignore'}
                    </span>
                  )}

                  {mode === 'organize' && (
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, 'left');
                        }}
                        className="px-1.5 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        disabled={idx === pages.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, 'right');
                        }}
                        className="px-1.5 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecute}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {mode === 'remove' && 'Delete Selected Pages'}
                  {mode === 'extract' && 'Extract Pages into New PDF'}
                  {mode === 'organize' && 'Save Reordered PDF'}
                </span>
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
          <h4 className="text-xl font-bold text-slate-900">Your PDF is ready!</h4>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Processed PDF</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
