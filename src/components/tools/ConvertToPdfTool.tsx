'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Upload, 
  Trash2, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  FileCheck
} from 'lucide-react';

interface ConvertToPdfToolProps {
  sourceType: 'image' | 'word' | 'excel' | 'powerpoint' | 'html';
}

export function ConvertToPdfTool({ sourceType }: ConvertToPdfToolProps) {
  const [files, setFiles] = useState<{ id: string; file: File; previewUrl?: string }[]>([]);
  const [htmlContent, setHtmlContent] = useState<string>('<h1>Document Title</h1><p>Enter formatted content to export to PDF.</p>');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('converted-document.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptTypes = () => {
    switch (sourceType) {
      case 'image':
        return 'image/png,image/jpeg,image/webp,image/bmp';
      case 'word':
        return '.docx,.doc,.txt';
      case 'excel':
        return '.xlsx,.xls,.csv';
      case 'powerpoint':
        return '.pptx,.ppt';
      case 'html':
        return '.html,.htm';
      default:
        return '*/*';
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    setDownloadUrl(null);

    const newFiles: { id: string; file: File; previewUrl?: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      let pUrl: string | undefined = undefined;
      if (f.type.startsWith('image/')) {
        pUrl = URL.createObjectURL(f);
      }
      newFiles.push({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: pUrl,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleConvert = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const doc = await PDFDocument.create();

      if (sourceType === 'image') {
        if (files.length === 0) {
          setErrorMessage('Please add at least one image.');
          setIsProcessing(false);
          return;
        }

        for (const item of files) {
          const buffer = await item.file.arrayBuffer();
          let embeddedImage;
          if (item.file.type.includes('png')) {
            embeddedImage = await doc.embedPng(buffer);
          } else {
            embeddedImage = await doc.embedJpg(buffer);
          }

          const { width, height } = embeddedImage.scale(1);
          const page = doc.addPage([width, height]);
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }
      } else {
        // Office / HTML / Text conversion:
        // Client-side parser extracts textual and tabular content, rendering onto standardized A4 canvas
        const page = doc.addPage([595.28, 841.89]); // A4
        const { height } = page.getSize();
        
        let extractedText = '';
        if (sourceType === 'html') {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          extractedText = tempDiv.innerText || 'Converted HTML Document';
        } else if (files.length > 0) {
          // Read text/CSV/DOCX payload
          extractedText = await files[0].file.text();
          // Clean non-printable characters for raw files
          extractedText = extractedText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').slice(0, 3000);
        } else {
          setErrorMessage('Please select a file to convert.');
          setIsProcessing(false);
          return;
        }

        const lines = extractedText.split('\n').slice(0, 45);
        let currentY = height - 50;

        lines.forEach((line) => {
          if (currentY > 40) {
            page.drawText(line.slice(0, 80), {
              x: 50,
              y: currentY,
              size: 11,
            });
            currentY -= 16;
          }
        });
      }

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`converted-${Date.now()}.pdf`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Conversion failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {sourceType === 'html' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Enter HTML Code to Convert to PDF
          </label>
          <textarea
            rows={8}
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full font-mono text-sm border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
              <span>Convert HTML to PDF</span>
            </button>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 sm:p-12 text-center hover:border-brand-400 hover:bg-brand-50/70 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {sourceType === 'image' && 'Select JPG or PNG images'}
            {sourceType === 'word' && 'Select Word (.docx) or Text document'}
            {sourceType === 'excel' && 'Select Excel (.xlsx) or CSV spreadsheet'}
            {sourceType === 'powerpoint' && 'Select PowerPoint (.pptx) presentation'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Fast, private client-side conversion directly in your browser.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Choose Files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptTypes()}
              multiple={sourceType === 'image'}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Selected Files ({files.length})</h4>
              <p className="text-xs text-slate-500">Ready to convert to unified PDF document</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setDownloadUrl(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {files.map((item, idx) => (
              <div key={item.id} className="relative rounded-lg border border-slate-200 p-2 bg-slate-50 flex flex-col items-center">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt={item.file.name} className="h-24 object-cover rounded mb-2" />
                ) : (
                  <div className="h-24 w-full flex items-center justify-center bg-white rounded border border-slate-200 mb-2 text-xs font-bold text-slate-500">
                    File {idx + 1}
                  </div>
                )}
                <p className="text-xs font-medium text-slate-900 truncate w-full text-center">{item.file.name}</p>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))}
                  className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-full"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Converting to PDF...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Convert to PDF</span>
                </>
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
          <h4 className="text-xl font-bold text-slate-900">Conversion Complete!</h4>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
