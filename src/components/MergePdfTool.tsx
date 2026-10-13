'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Upload, 
  File, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  CheckCircle, 
  AlertCircle,
  FileCheck,
  Loader2
} from 'lucide-react';

interface PdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

export function MergePdfTool() {
  const [files, setFiles] = useState<PdfFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('merged-document.pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ pageCount: number; sizeBytes: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelected = (newFileList: FileList | null) => {
    if (!newFileList || newFileList.length === 0) return;
    setErrorMessage(null);
    setDownloadUrl(null);
    setSuccessInfo(null);

    const validPdfs: PdfFileItem[] = [];
    let hasInvalid = false;

    for (let i = 0; i < newFileList.length; i++) {
      const file = newFileList[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        validPdfs.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
        });
      } else {
        hasInvalid = true;
      }
    }

    if (hasInvalid) {
      setErrorMessage('Some files were ignored because only PDF files are supported.');
    }

    setFiles((prev) => [...prev, ...validPdfs]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDownloadUrl(null);
    setSuccessInfo(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === files.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newFiles = [...files];
    const [moved] = newFiles.splice(index, 1);
    newFiles.splice(targetIndex, 0, moved);
    setFiles(newFiles);
    setDownloadUrl(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      setErrorMessage('Please select at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const mergedPdf = await PDFDocument.create();
      let totalPageCount = 0;

      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        totalPageCount += copiedPages.length;
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setDownloadName(`freepdfkit-merged-${Date.now()}.pdf`);
      setSuccessInfo({
        pageCount: totalPageCount,
        sizeBytes: blob.size,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(
        `Failed to merge PDF files: ${error.message || 'Please check that files are not encrypted or corrupted.'}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 sm:p-12 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/70"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
          <Upload className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Choose PDF files to merge</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-md">
          Drag and drop multiple PDF documents here, or click to browse files from your computer or phone.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Upload className="h-4 w-4" />
            <span>Select PDF Files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>

        <p className="mt-4 text-xs font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
          Files are processed entirely within your browser. Nothing is ever uploaded to our servers.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Selected Files List & Sorting */}
      {files.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Selected Documents ({files.length})
              </h4>
              <p className="text-xs text-slate-500">
                Arrange files in the exact order you want them merged.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded border border-brand-200 hover:bg-brand-50"
              >
                + Add More Files
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setDownloadUrl(null);
                  setSuccessInfo(null);
                }}
                className="text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1.5"
              >
                Clear All
              </button>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {files.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <File className="h-5 w-5 text-brand-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate max-w-xs sm:max-w-md">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatFileSize(item.size)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveFile(index, 'up')}
                    aria-label={`Move ${item.name} up`}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === files.length - 1}
                    onClick={() => moveFile(index, 'down')}
                    aria-label={`Move ${item.name} down`}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="p-1 text-slate-400 hover:text-red-600 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Total input files: {files.length}
            </span>
            <button
              type="button"
              disabled={files.length < 2 || isProcessing}
              onClick={mergePdfs}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Merging PDFs in browser...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Merge {files.length} PDFs Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Result & Download State */}
      {downloadUrl && successInfo && (
        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-6 sm:p-8 text-center animate-in fade-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm mb-3">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h4 className="text-xl font-bold text-slate-900">
            Your PDF has been successfully merged!
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            Consolidated {successInfo.pageCount} total pages ({formatFileSize(successInfo.sizeBytes)})
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-5 w-5" />
              <span>Download Merged PDF</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setDownloadUrl(null);
                setFiles([]);
                setSuccessInfo(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Merge More Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
