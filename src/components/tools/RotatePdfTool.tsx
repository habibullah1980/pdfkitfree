'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { 
  Upload, 
  RotateCw, 
  RotateCcw, 
  File, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Trash2
} from 'lucide-react';

interface PageRotation {
  pageIndex: number;
  rotation: number; // 0, 90, 180, 270
}

export function RotatePdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [rotations, setRotations] = useState<PageRotation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('rotated-document.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setDownloadUrl(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF file.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const count = doc.getPageCount();
      setFile(selectedFile);
      setNumPages(count);
      setRotations(Array.from({ length: count }, (_, i) => ({ pageIndex: i, rotation: 0 })));
    } catch {
      setErrorMessage('Failed to parse PDF document.');
    }
  };

  const rotateAll = (deg: number) => {
    setRotations((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + deg + 360) % 360,
      }))
    );
  };

  const rotateSingle = (index: number, deg: number) => {
    setRotations((prev) =>
      prev.map((p) => (p.pageIndex === index ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p))
    );
  };

  const handleSave = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      rotations.forEach((r) => {
        if (r.rotation !== 0) {
          const page = doc.getPage(r.pageIndex);
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + r.rotation) % 360));
        }
      });

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`rotated-${file.name}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Failed to rotate PDF: ${error.message}`);
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
            <RotateCw className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Choose a PDF file to rotate</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Rotate single pages or the entire PDF document 90, 180, or 270 degrees permanently.
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
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
            <div className="flex items-center gap-3">
              <File className="h-6 w-6 text-brand-600" />
              <div>
                <h4 className="text-base font-semibold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">{numPages} pages</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotateAll(90)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Rotate All 90° Clockwise</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setDownloadUrl(null);
                }}
                className="text-xs text-slate-500 hover:text-red-600 p-1.5"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 max-h-[360px] overflow-y-auto p-2 border rounded-lg bg-slate-50">
            {rotations.map((r, idx) => (
              <div key={idx} className="flex flex-col items-center bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-xs font-medium text-slate-500 mb-2">Page {idx + 1}</span>
                <div
                  className="w-16 h-22 border border-brand-200 bg-brand-50 flex items-center justify-center rounded text-xs font-bold text-brand-700 transition-transform duration-200"
                  style={{ transform: `rotate(${r.rotation}deg)` }}
                >
                  P.{idx + 1}
                </div>
                <div className="flex items-center gap-1 mt-3">
                  <button
                    type="button"
                    onClick={() => rotateSingle(idx, -90)}
                    title="Rotate Counterclockwise"
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => rotateSingle(idx, 90)}
                    title="Rotate Clockwise"
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Rotating PDF...</span>
                </>
              ) : (
                <span>Save Rotated PDF</span>
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
          <h4 className="text-xl font-bold text-slate-900">Your PDF pages have been rotated!</h4>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Rotated PDF</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
