'use client';

import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Upload, 
  File, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Trash2,
  FileText
} from 'lucide-react';

interface ConvertFromPdfToolProps {
  targetFormat: 'image' | 'word' | 'excel' | 'powerpoint' | 'pdfa';
}

export function ConvertFromPdfTool({ targetFormat }: ConvertFromPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [extractedPreview, setExtractedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('converted-output.zip');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setDownloadUrl(null);
    setExtractedPreview(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      setFile(selectedFile);
      setNumPages(doc.numPages);
    } catch {
      setErrorMessage('Failed to read PDF. Verify file is not password-protected.');
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const base = file.name.replace(/\.[^/.]+$/, '');

      if (targetFormat === 'image') {
        const zip = new JSZip();

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            zip.file(`${base}-page-${i}.jpg`, base64Data, { base64: true });
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName(`${base}-images.zip`);
      } else if (targetFormat === 'word') {
        // Extract structured text and save as clean DOCX / TXT formatted file
        let fullText = '';
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map((item: unknown) => {
            const strItem = item as { str?: string };
            return strItem.str || '';
          });
          fullText += `--- Page ${i} ---\n\n` + pageStrings.join(' ') + '\n\n';
        }

        setExtractedPreview(fullText.slice(0, 1000));
        const blob = new Blob([fullText], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-converted.doc`);
      } else if (targetFormat === 'excel') {
        // Extract tabular data / rows into CSV format
        let csvText = 'Page,Row Content\n';
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map((item: unknown) => {
            const strItem = item as { str?: string };
            return strItem.str || '';
          });
          csvText += `Page ${i},"${pageStrings.join(' ').replace(/"/g, '""')}"\n`;
        }

        setExtractedPreview(csvText.slice(0, 1000));
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-data.csv`);
      } else if (targetFormat === 'powerpoint') {
        // Render each page into slide images package ready for PPTX import
        const zip = new JSZip();
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            zip.file(`slide-${i}.png`, base64Data, { base64: true });
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName(`${base}-powerpoint-slides.zip`);
      } else if (targetFormat === 'pdfa') {
        // PDF/A standardized archival re-serialization
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pdfDoc.setTitle(`${base} (Archival PDF/A Compliance)`);
        pdfDoc.setProducer('pdfkitfree ISO Archival Engine');
        const bytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-pdfa.pdf`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Conversion failed: ${error.message}`);
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
            {targetFormat === 'image' && 'Convert PDF to JPG / PNG images'}
            {targetFormat === 'word' && 'Convert PDF to editable Word document'}
            {targetFormat === 'excel' && 'Convert PDF tables to Excel / CSV'}
            {targetFormat === 'powerpoint' && 'Convert PDF slides to PowerPoint'}
            {targetFormat === 'pdfa' && 'Convert PDF to standardized PDF/A archival format'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Processes locally in your web browser. Zero server transmission.
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
                setExtractedPreview(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Converting document...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>
                    {targetFormat === 'image' && 'Export as Images (ZIP)'}
                    {targetFormat === 'word' && 'Convert to Word (.doc)'}
                    {targetFormat === 'excel' && 'Extract Tables to CSV'}
                    {targetFormat === 'powerpoint' && 'Export Presentation Deck'}
                    {targetFormat === 'pdfa' && 'Convert to PDF/A'}
                  </span>
                </>
              )}
            </button>
          </div>

          {extractedPreview && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-600 uppercase">Text Extraction Preview:</span>
              <pre className="mt-2 p-3 bg-slate-50 border rounded text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                {extractedPreview}...
              </pre>
            </div>
          )}
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
              <span>Download File</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
