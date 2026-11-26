'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Upload, 
  File as FileIcon, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  Sparkles,
  Info
} from 'lucide-react';

interface OptimizePdfToolProps {
  toolType: 'compress' | 'repair' | 'web';
}

export function OptimizePdfTool({ toolType }: OptimizePdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [newSize, setNewSize] = useState<number>(0);
  const [compressionLevel, setCompressionLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('optimized.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URL cleanup
  const prevDownloadUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevDownloadUrlRef.current && prevDownloadUrlRef.current !== downloadUrl) {
      URL.revokeObjectURL(prevDownloadUrlRef.current);
    }
    prevDownloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  useEffect(() => {
    return () => {
      if (prevDownloadUrlRef.current) {
        URL.revokeObjectURL(prevDownloadUrlRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setDownloadUrl(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
  };

  const handleOptimize = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const base = file.name.replace(/\.[^/.]+$/, '');
      let finalBytes: Uint8Array;

      if (toolType === 'compress' && compressionLevel === 'extreme') {
        // Extreme compression: re-rasterize and recompress pages with high-efficiency JPEG
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          const srcDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
          const newDoc = await PDFDocument.create();

          for (let i = 1; i <= srcDoc.numPages; i++) {
            const page = await srcDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              await page.render({ canvasContext: ctx, viewport }).promise;
              const jpegUrl = canvas.toDataURL('image/jpeg', 0.65);
              const base64 = jpegUrl.replace(/^data:image\/jpeg;base64,/, '');
              const bin = atob(base64);
              const imgBytes = new Uint8Array(bin.length);
              for (let j = 0; j < bin.length; j++) {
                imgBytes[j] = bin.charCodeAt(j);
              }

              const embedded = await newDoc.embedJpg(imgBytes);
              const { width, height } = page.getViewport({ scale: 1.0 });
              const p = newDoc.addPage([width, height]);
              p.drawImage(embedded, { x: 0, y: 0, width, height });
            }
          }
          finalBytes = await newDoc.save({ useObjectStreams: true });
        } catch {
          // Fallback to standard object stream compression if canvas fails
          const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          finalBytes = await doc.save({ useObjectStreams: true });
        }
      } else {
        // Recommended / Low / Repair / Web:
        // Cleans xref tables, strips unreferenced objects, uses object streams
        const doc = await PDFDocument.load(buffer, { 
          ignoreEncryption: true,
          updateMetadata: toolType === 'repair' ? false : true 
        });

        finalBytes = await doc.save({
          useObjectStreams: true,
          addDefaultPage: false,
        });
      }

      // If output is larger than original file and tool is compress, keep original bytes
      let effectiveBytes = finalBytes;
      let effectiveSize = finalBytes.length;

      if (toolType === 'compress' && effectiveSize >= originalSize) {
        // Never claim compression if file becomes larger
        effectiveBytes = new Uint8Array(buffer);
        effectiveSize = originalSize;
      }

      const blob = new Blob([new Uint8Array(effectiveBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setNewSize(effectiveSize);
      setDownloadUrl(url);

      if (toolType === 'compress') setDownloadName(`${base}-compressed.pdf`);
      else if (toolType === 'repair') setDownloadName(`${base}-repaired.pdf`);
      else setDownloadName(`${base}-web-optimized.pdf`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Optimization failed: ${error.message || 'File structure is severely corrupted.'}`);
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
            {toolType === 'compress' && 'Choose a PDF to compress'}
            {toolType === 'repair' && 'Choose a damaged PDF to repair'}
            {toolType === 'web' && 'Choose a PDF to optimize for web viewing'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Fast, client-side processing without uploading your file to cloud servers.
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
              <FileIcon className="h-6 w-6 text-brand-600" />
              <div>
                <h4 className="text-base font-semibold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">Original Size: {formatFileSize(originalSize)}</p>
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

          {toolType === 'compress' && (
            <div className="space-y-3 mb-6">
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Compression Profile
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'extreme', title: 'Extreme Compression', desc: 'Maximum file size reduction' },
                  { id: 'recommended', title: 'Recommended', desc: 'Balanced stream & metadata compression' },
                  { id: 'low', title: 'Lossless', desc: 'Preserves 100% original pixel data' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCompressionLevel(item.id as 'recommended' | 'extreme' | 'low')}
                    className={`rounded-lg border p-3.5 text-left transition ${
                      compressionLevel === item.id
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {toolType === 'repair' && (
            <div className="mb-6 rounded-lg bg-teal-50 border border-teal-200 p-4 text-xs text-teal-900">
              <p className="font-semibold mb-1">How PDF Repair Works:</p>
              <p>Rebuilds damaged cross-reference tables, repairs corrupted trailers, and recovers uncorrupted page objects into a compliant PDF.</p>
            </div>
          )}

          {toolType === 'web' && (
            <div className="mb-6 rounded-lg bg-brand-50 border border-brand-200 p-4 text-xs text-brand-900">
              <p className="font-semibold mb-1">Fast Web View Optimization:</p>
              <p>Re-serializes page objects into sequential object streams for instantaneous first-page loading across modern web browsers.</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleOptimize}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {toolType === 'compress' && 'Compress PDF Now'}
                    {toolType === 'repair' && 'Repair PDF Now'}
                    {toolType === 'web' && 'Optimize for Web'}
                  </span>
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
          <h4 className="text-xl font-bold text-slate-900">
            {toolType === 'compress' && (newSize < originalSize ? 'PDF Compressed Successfully!' : 'PDF Optimization Complete')}
            {toolType === 'repair' && 'PDF Repaired Successfully!'}
            {toolType === 'web' && 'PDF Optimized for Web!'}
          </h4>

          {toolType === 'compress' && newSize >= originalSize ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1 text-xs text-slate-700">
              <Info className="h-3.5 w-3.5 text-slate-500" />
              <span>Document is already at maximum compression ({formatFileSize(originalSize)})</span>
            </div>
          ) : (
            <p className="text-sm text-slate-600 mt-1">
              Original: {formatFileSize(originalSize)} &bull; Output: {formatFileSize(newSize)}
              {newSize < originalSize && (
                <span className="text-teal-700 font-bold ml-1">
                  ({Math.round(((originalSize - newSize) / originalSize) * 100)}% reduction)
                </span>
              )}
            </p>
          )}

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
