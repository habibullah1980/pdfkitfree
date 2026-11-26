'use client';

import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Upload, 
  File as FileIcon, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  FileText
} from 'lucide-react';
import { openPdfDocument } from '@/lib/pdfjs-client';
import { buildPptxFromImages, preparePdfA, rowsToCsv, textItemsToRows } from '@/lib/pdf-export-formats';

interface ConvertFromPdfToolProps {
  targetFormat: 'image' | 'word' | 'excel' | 'powerpoint' | 'pdfa';
  imageFormat?: 'jpg' | 'png';
}

export function ConvertFromPdfTool({ targetFormat, imageFormat = 'jpg' }: ConvertFromPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [extractedPreview, setExtractedPreview] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('converted-output.zip');
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

  const handleFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setDownloadUrl(null);
    setExtractedPreview(null);
    setResultNote(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const doc = await openPdfDocument(buffer);
      setFile(selectedFile);
      setNumPages(doc.numPages);
    } catch {
      setErrorMessage('Failed to read PDF. Verify file is not password-protected or corrupted.');
    }
  };

  // Build a standard OpenXML DOCX document package with JSZip
  const buildDocxPackage = async (paragraphs: string[]): Promise<Blob> => {
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    const pXml = paragraphs.map(p => {
      const escaped = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
    }).join('');

    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${pXml}
  </w:body>
</w:document>`);

    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await openPdfDocument(buffer);
      const base = file.name.replace(/\.[^/.]+$/, '');

      if (targetFormat === 'image') {
        const zip = new JSZip();
        const isPng = imageFormat === 'png' || file.name.includes('png');
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const ext = isPng ? 'png' : 'jpg';

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (!isPng) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL(mimeType, isPng ? undefined : 0.92);
            const base64Data = dataUrl.replace(new RegExp(`^data:${mimeType};base64,`), '');
            zip.file(`${base}-page-${i}.${ext}`, base64Data, { base64: true });
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setDownloadName(`${base}-${ext}-images.zip`);
      } else if (targetFormat === 'word') {
        // Extract structured text and build real DOCX
        const paragraphs: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map((item: unknown) => {
            const strItem = item as { str?: string };
            return strItem.str || '';
          });
          const text = pageStrings.join(' ').trim();
          paragraphs.push(`--- Page ${i} ---`);
          if (text) {
            paragraphs.push(text);
          } else {
            paragraphs.push('[Image or Scanned Content]');
          }
        }

        setExtractedPreview(paragraphs.join('\n\n').slice(0, 1000));
        const docxBlob = await buildDocxPackage(paragraphs);
        const url = URL.createObjectURL(docxBlob);
        setDownloadUrl(url);
        setDownloadName(`${base}-converted.docx`);
      } else if (targetFormat === 'excel') {
        // Rebuild rows and columns from text positions, page by page, then write CSV (UTF-8 with BOM for Excel).
        const allRows: string[][] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items
            .map((item: unknown) => item as { str?: string; transform?: number[]; width?: number; height?: number })
            .filter((it) => typeof it.str === 'string' && Array.isArray(it.transform))
            .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5], width: it.width || 0, height: it.height || 10 }));
          if (doc.numPages > 1) allRows.push([`Page ${i}`]);
          allRows.push(...textItemsToRows(items));
        }
        const csvText = rowsToCsv(allRows);
        setExtractedPreview(csvText.slice(0, 1000));
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-data.csv`);
      } else if (targetFormat === 'powerpoint') {
        // Render each page to an image and place it on its own slide in a real .pptx file.
        const slides: { png: Uint8Array; widthPt: number; heightPt: number }[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const base1 = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Your browser blocked page rendering.');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          const pngBlob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render a page.'))), 'image/png')
          );
          slides.push({ png: new Uint8Array(await pngBlob.arrayBuffer()), widthPt: base1.width, heightPt: base1.height });
        }
        const pptxBlob = await buildPptxFromImages(slides);
        const url = URL.createObjectURL(pptxBlob);
        setDownloadUrl(url);
        setDownloadName(`${base}.pptx`);
      } else if (targetFormat === 'pdfa') {
        // Add PDF/A-2b metadata, colour profile and file ID; report fonts that are not embedded.
        const { bytes, unembeddedFonts } = await preparePdfA(buffer, base);
        setResultNote(
          unembeddedFonts.length === 0
            ? 'PDF/A-2b metadata, sRGB colour profile and file ID added. All fonts are embedded.'
            : `PDF/A-2b metadata and colour profile added, but ${unembeddedFonts.length} font${unembeddedFonts.length === 1 ? ' is' : 's are'} not embedded in your original (${unembeddedFonts.slice(0, 3).join(', ')}${unembeddedFonts.length > 3 ? '…' : ''}). Strict PDF/A checkers will flag this. Re-export from the original app with "embed fonts" on for full compliance.`
        );
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-archival-pdfa.pdf`);
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
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#CFCBFF] bg-white p-8 sm:p-12 text-center hover:border-brand-600 hover:bg-brand-50 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {targetFormat === 'image' && (imageFormat === 'png' ? 'Convert PDF to PNG Images' : 'Convert PDF to JPG Images')}
            {targetFormat === 'word' && 'Convert PDF to editable Word document (.docx)'}
            {targetFormat === 'excel' && 'Convert PDF tables to Excel / CSV'}
            {targetFormat === 'powerpoint' && 'Convert PDF pages to a PowerPoint (.pptx) deck'}
            {targetFormat === 'pdfa' && 'Prepare a PDF/A-2b archival copy'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Processes 100% locally in your web browser. Zero server transmission.
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
                <p className="text-xs text-slate-500">{numPages} pages detected &bull; Ready for conversion</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDownloadUrl(null);
                setExtractedPreview(null);
                setResultNote(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          {extractedPreview && (
            <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Content Preview:</p>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono bg-white p-3 rounded border border-slate-200">
                {extractedPreview}
              </pre>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
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
                    {targetFormat === 'image' && (imageFormat === 'png' ? 'Export as PNG' : 'Export as JPG')}
                    {targetFormat === 'word' && 'Convert to Word (.docx)'}
                    {targetFormat === 'excel' && 'Convert to Excel (.csv)'}
                    {targetFormat === 'powerpoint' && 'Convert to PowerPoint (.pptx)'}
                    {targetFormat === 'pdfa' && 'Convert to PDF/A'}
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
          <h4 className="text-xl font-bold text-slate-900">Conversion Complete!</h4>
          <p className="text-xs text-slate-600 mt-1">Your exported document is ready for download.</p>
          {resultNote && <p className="mx-auto mt-3 max-w-xl text-sm text-slate-700">{resultNote}</p>}
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
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
