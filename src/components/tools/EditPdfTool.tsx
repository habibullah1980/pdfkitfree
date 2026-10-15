'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { 
  Upload, 
  File, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  Type,
  Crop,
  Layers,
  Stamp
} from 'lucide-react';

interface EditPdfToolProps {
  toolType: 'add-text' | 'add-image' | 'annotate' | 'watermark' | 'crop' | 'flatten';
}

export function EditPdfTool({ toolType }: EditPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [customText, setCustomText] = useState<string>('pdfkitfree Document Note');
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
      setErrorMessage('Failed to open PDF document.');
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
        // Add text to first page or all pages
        const page = doc.getPage(0);
        page.drawText(customText, {
          x: 50,
          y: page.getHeight() - 70,
          size: 14,
          font,
          color: rgb(0.1, 0.2, 0.7),
        });
        setDownloadName(`${base}-text-added.pdf`);
      } else if (toolType === 'add-image') {
        if (!imageFile) {
          setErrorMessage('Please choose an image to stamp onto the PDF.');
          setIsProcessing(false);
          return;
        }
        const imgBuffer = await imageFile.arrayBuffer();
        let embeddedImg;
        if (imageFile.type.includes('png')) {
          embeddedImg = await doc.embedPng(imgBuffer);
        } else {
          embeddedImg = await doc.embedJpg(imgBuffer);
        }
        const page = doc.getPage(0);
        const { width, height } = embeddedImg.scale(0.3);
        page.drawImage(embeddedImg, {
          x: 50,
          y: page.getHeight() - height - 50,
          width,
          height,
        });
        setDownloadName(`${base}-image-stamped.pdf`);
      } else if (toolType === 'watermark') {
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const total = doc.getPageCount();

        for (let i = 0; i < total; i++) {
          const page = doc.getPage(i);
          const { width, height } = page.getSize();
          const textSize = Math.min(width, height) / 8;
          const textWidth = font.widthOfTextAtSize(watermarkText, textSize);

          page.drawText(watermarkText, {
            x: (width - textWidth) / 2,
            y: height / 2,
            size: textSize,
            font,
            color: rgb(0.7, 0.7, 0.7),
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
        const form = doc.getForm();
        form.flatten();
        setDownloadName(`${base}-flattened.pdf`);
      } else if (toolType === 'annotate') {
        // Draw highlight bar and callout marker
        const page = doc.getPage(0);
        page.drawRectangle({
          x: 50,
          y: page.getHeight() - 100,
          width: 300,
          height: 20,
          color: rgb(1, 0.95, 0.3),
          opacity: 0.5,
        });
        const font = await doc.embedFont(StandardFonts.Helvetica);
        page.drawText('Highlight Note', {
          x: 55,
          y: page.getHeight() - 95,
          size: 10,
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
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-8 sm:p-12 text-center hover:border-brand-400 hover:bg-brand-50/70 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            {toolType === 'add-text' && <Type className="h-7 w-7" />}
            {toolType === 'watermark' && <Stamp className="h-7 w-7" />}
            {toolType === 'crop' && <Crop className="h-7 w-7" />}
            {toolType === 'flatten' && <Layers className="h-7 w-7" />}
            {toolType !== 'add-text' && toolType !== 'watermark' && toolType !== 'crop' && toolType !== 'flatten' && (
              <Upload className="h-7 w-7" />
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {toolType === 'add-text' && 'Choose a PDF to add text'}
            {toolType === 'add-image' && 'Choose a PDF to add image or logo'}
            {toolType === 'watermark' && 'Choose a PDF to stamp with watermark'}
            {toolType === 'crop' && 'Choose a PDF to crop page margins'}
            {toolType === 'flatten' && 'Choose a PDF to flatten form fields'}
            {toolType === 'annotate' && 'Choose a PDF to annotate and highlight'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Fast, client-side vector editing without quality loss.
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

          {/* Tool specific controls */}
          <div className="space-y-4 mb-6">
            {toolType === 'add-text' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Text to Insert onto Page
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>
            )}

            {toolType === 'add-image' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Image / Logo Stamp (PNG or JPG)
                </label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="text-sm text-slate-600"
                />
              </div>
            )}

            {toolType === 'watermark' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-brand-600 mt-2"
                  />
                </div>
              </div>
            )}

            {toolType === 'crop' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Margin Trim (Points: {cropMargin} pt ≈ {(cropMargin / 72).toFixed(2)} inches)
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={cropMargin}
                  onChange={(e) => setCropMargin(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-600 mt-2"
                />
              </div>
            )}

            {toolType === 'flatten' && (
              <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
                Flattening converts all fillable form inputs, digital signatures, and comments into immutable, static page elements to prevent tampering.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Applying changes...</span>
                </>
              ) : (
                <span>Save Edited PDF</span>
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
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
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
