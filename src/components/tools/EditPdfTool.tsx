'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { 
  Upload, 
  File as FileIcon, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  Type,
  Crop,
  Layers,
  Stamp,
  Highlighter
} from 'lucide-react';

interface EditPdfToolProps {
  toolType: 'add-text' | 'add-image' | 'annotate' | 'watermark' | 'crop' | 'flatten';
}

export function EditPdfTool({ toolType }: EditPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [customText, setCustomText] = useState<string>('FreePDFKit Note');
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropMargin, setCropMargin] = useState<number>(36); // Points (0.5 inch)
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('edited-document.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
      setErrorMessage('Failed to open PDF document. File may be corrupted or encrypted.');
    }
  };

  const handleApplyEdit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const base = file.name.replace(/\.[^/.]+$/, '');

      if (toolType === 'add-text') {
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const total = doc.getPageCount();
        for (let i = 0; i < total; i++) {
          const page = doc.getPage(i);
          page.drawText(customText, {
            x: 50,
            y: page.getHeight() - 50,
            size: 13,
            font,
            color: rgb(0.1, 0.2, 0.7),
          });
        }
        setDownloadName(`${base}-text-added.pdf`);
      } else if (toolType === 'add-image') {
        if (!imageFile) {
          setErrorMessage('Please choose an image file to stamp onto the PDF.');
          setIsProcessing(false);
          return;
        }

        // Convert image through canvas to ensure compatible JPEG bytes
        const img = new Image();
        const objUrl = URL.createObjectURL(imageFile);
        const imgBytes: Uint8Array = await new Promise((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(objUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas error'));
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (b) => {
              if (!b) return reject(new Error('Blob error'));
              resolve(new Uint8Array(await b.arrayBuffer()));
            }, 'image/png');
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            reject(new Error('Failed to decode image'));
          };
          img.src = objUrl;
        });

        const embeddedImg = await doc.embedPng(imgBytes);
        const page = doc.getPage(0);
        const maxW = 200;
        const maxH = 150;
        const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
        const renderW = embeddedImg.width * scale;
        const renderH = embeddedImg.height * scale;

        page.drawImage(embeddedImg, {
          x: 50,
          y: page.getHeight() - renderH - 50,
          width: renderW,
          height: renderH,
        });
        setDownloadName(`${base}-image-stamped.pdf`);
      } else if (toolType === 'watermark') {
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const total = doc.getPageCount();

        for (let i = 0; i < total; i++) {
          const page = doc.getPage(i);
          const { width, height } = page.getSize();
          const textSize = Math.min(width, height) / 10;
          const textWidth = font.widthOfTextAtSize(watermarkText, textSize);

          page.drawText(watermarkText, {
            x: (width - textWidth) / 2,
            y: height / 2,
            size: textSize,
            font,
            color: rgb(0.65, 0.65, 0.65),
            opacity: watermarkOpacity,
            rotate: degrees(45),
          });
        }
        setDownloadName(`${base}-watermarked.pdf`);
      } else if (toolType === 'crop') {
        // Trim margins across every page
        const total = doc.getPageCount();
        for (let i = 0; i < total; i++) {
          const page = doc.getPage(i);
          const { width, height } = page.getSize();
          page.setCropBox(
            cropMargin,
            cropMargin,
            Math.max(100, width - cropMargin * 2),
            Math.max(100, height - cropMargin * 2)
          );
        }
        setDownloadName(`${base}-cropped.pdf`);
      } else if (toolType === 'flatten') {
        // Flatten interactive form fields and annotations into static background
        try {
          const form = doc.getForm();
          form.flatten();
        } catch {
          // If document has no AcroForm, proceed with re-saving
        }
        setDownloadName(`${base}-flattened.pdf`);
      } else if (toolType === 'annotate') {
        // Draw highlight bar and callout marker
        const page = doc.getPage(0);
        page.drawRectangle({
          x: 50,
          y: page.getHeight() - 100,
          width: 300,
          height: 22,
          color: rgb(1, 0.95, 0.3),
          opacity: 0.5,
        });
        const font = await doc.embedFont(StandardFonts.Helvetica);
        page.drawText('Annotated Note', {
          x: 55,
          y: page.getHeight() - 94,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        setDownloadName(`${base}-annotated.pdf`);
      }

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Edit failed: ${error.message}`);
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
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#CFCBFF] bg-white p-8 sm:p-12 text-center hover:border-brand-600 hover:bg-brand-50 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            {toolType === 'add-text' && <Type className="h-7 w-7" />}
            {toolType === 'add-image' && <Stamp className="h-7 w-7" />}
            {toolType === 'annotate' && <Highlighter className="h-7 w-7" />}
            {toolType === 'watermark' && <Stamp className="h-7 w-7" />}
            {toolType === 'crop' && <Crop className="h-7 w-7" />}
            {toolType === 'flatten' && <Layers className="h-7 w-7" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {toolType === 'add-text' && 'Choose a PDF to add custom text'}
            {toolType === 'add-image' && 'Choose a PDF to insert an image'}
            {toolType === 'annotate' && 'Choose a PDF to annotate & highlight'}
            {toolType === 'watermark' && 'Choose a PDF to apply a watermark'}
            {toolType === 'crop' && 'Choose a PDF to trim and crop margins'}
            {toolType === 'flatten' && 'Choose a PDF to flatten form fields'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            All modifications run 100% locally in your browser memory with zero cloud uploads.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
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
        <div className="rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-6 shadow-lift sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <FileIcon className="h-6 w-6 text-brand-600" />
              <div>
                <h4 className="text-base font-semibold text-slate-900">{file.name}</h4>
                <p className="text-xs text-slate-500">{numPages} pages &bull; Ready for editing</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDownloadUrl(null);
                setImageFile(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          {toolType === 'add-text' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Text Content to Add
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {toolType === 'add-image' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Image to Insert
                </label>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {imageFile ? imageFile.name : 'Choose Image (PNG, JPG, WebP)'}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          )}

          {toolType === 'watermark' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Watermark Opacity ({Math.round(watermarkOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full max-w-md"
                />
              </div>
            </div>
          )}

          {toolType === 'crop' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Margin Trim (Points): {cropMargin} pt
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="2"
                  value={cropMargin}
                  onChange={(e) => setCropMargin(parseInt(e.target.value, 10))}
                  className="w-full max-w-md"
                />
                <p className="text-xs text-slate-500 mt-1">Trims outer margins equally on all 4 borders across all pages.</p>
              </div>
            </div>
          )}

          {toolType === 'flatten' && (
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 mb-6">
              Flattening renders all interactive form fields, checkboxes, and text inputs directly into the background graphics layer, making the document permanently read-only and uneditable.
            </div>
          )}

          {toolType === 'annotate' && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-6">
              Adds standardized highlight box and annotation callouts onto the document canvas.
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyEdit}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Applying changes...</span>
                </>
              ) : (
                <span>
                  {toolType === 'add-text' && 'Add Text to PDF'}
                  {toolType === 'add-image' && 'Stamp Image onto PDF'}
                  {toolType === 'watermark' && 'Apply Watermark'}
                  {toolType === 'crop' && 'Crop PDF Margins'}
                  {toolType === 'flatten' && 'Flatten PDF Form'}
                  {toolType === 'annotate' && 'Add Annotation'}
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
          <h4 className="text-xl font-bold text-slate-900">Document Edited Successfully!</h4>
          <p className="text-xs text-slate-600 mt-1">Your modified PDF has been saved and is ready for download.</p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Edited PDF</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
