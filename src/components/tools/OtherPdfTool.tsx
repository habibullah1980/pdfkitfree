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
  ScanText,
  Image as ImageIcon,
  GitCompare,
  CheckSquare
} from 'lucide-react';
import { openPdfDocument } from '@/lib/pdfjs-client';

interface OtherPdfToolProps {
  toolType: 'extract-text' | 'extract-images' | 'compare' | 'fill-form';
}

export function OtherPdfTool({ toolType }: OtherPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [extractedResult, setExtractedResult] = useState<string | null>(null);
  const [comparisonSummary, setComparisonSummary] = useState<{ 
    pagesA: number; 
    pagesB: number; 
    match: boolean;
    textSimilarity: number;
    differenceNotes: string[];
  } | null>(null);
  const [formFieldsList, setFormFieldsList] = useState<{ name: string; value: string; type: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('output.txt');
  const [resultNote, setResultNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondFileInputRef = useRef<HTMLInputElement>(null);

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
    setExtractedResult(null);
    setComparisonSummary(null);
    setFormFieldsList([]);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    setFile(selectedFile);

    // If tool is fill-form, inspect form fields immediately
    if (toolType === 'fill-form') {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const fieldDetails = fields.map((f) => ({
          name: f.getName(),
          value: '',
          type: f.constructor.name.replace('PDF', ''),
        }));
        setFormFieldsList(fieldDetails);
      } catch {
        // Document has no form
      }
    }
  };

  const handleExecute = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setResultNote(null);
    setDownloadUrl(null);

    try {
      const buffer = await file.arrayBuffer();
      const doc = await openPdfDocument(buffer);
      const base = file.name.replace(/\.[^/.]+$/, '');

      if (toolType === 'extract-text') {
        let fullText = '';
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map((item: unknown) => {
            const strItem = item as { str?: string };
            return strItem.str || '';
          });
          const pageStr = pageStrings.join(' ').replace(/\s+/g, ' ').trim();
          fullText += `=== Page ${i} ===\n` + (pageStr || '[No selectable text detected on this page]') + '\n\n';
        }


        setExtractedResult(fullText);
        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-extracted-text.txt`);
      } else if (toolType === 'extract-images') {
        const { extractPdfImages } = await import('@/lib/pdf-image-extract');
        const { images, skipped } = await extractPdfImages(buffer);
        if (images.length === 0) {
          setErrorMessage(
            skipped > 0
              ? `Found ${skipped} image${skipped === 1 ? '' : 's'} in an unusual format that could not be converted. Try PDF to JPG to save whole pages instead.`
              : 'This PDF has no embedded images. If the pages are scans or drawings, use PDF to JPG to save whole pages as images.'
          );
          return;
        }
        const zip = new JSZip();
        for (const img of images) zip.file(img.name, img.bytes);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setDownloadUrl(URL.createObjectURL(zipBlob));
        setDownloadName(`${base}-images.zip`);
        setResultNote(
          `Extracted ${images.length} image${images.length === 1 ? '' : 's'} at original resolution` +
            (skipped > 0 ? `. ${skipped} image${skipped === 1 ? '' : 's'} in an unusual format could not be converted.` : '.')
        );
      } else if (toolType === 'compare') {
        if (!secondFile) {
          setErrorMessage('Please select a second PDF file to compare.');
          setIsProcessing(false);
          return;
        }

        const bufferB = await secondFile.arrayBuffer();
        const docB = await openPdfDocument(bufferB);

        // Extract text from both docs
        let textA = '';
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const tc = await p.getTextContent();
          textA += tc.items.map((it: unknown) => (it as { str?: string }).str || '').join(' ');
        }

        let textB = '';
        for (let i = 1; i <= docB.numPages; i++) {
          const p = await docB.getPage(i);
          const tc = await p.getTextContent();
          textB += tc.items.map((it: unknown) => (it as { str?: string }).str || '').join(' ');
        }

        // Calculate simple character / word similarity
        const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
        const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));
        const commonWords = Array.from(wordsA).filter((w) => wordsB.has(w));
        const unionList = Array.from(wordsA).concat(Array.from(wordsB));
        const unionWords = new Set(unionList);
        const similarity = unionWords.size > 0 ? Math.round((commonWords.length / unionWords.size) * 100) : 100;

        const diffNotes: string[] = [];
        if (doc.numPages !== docB.numPages) {
          diffNotes.push(`Page counts differ: Document A has ${doc.numPages} pages, Document B has ${docB.numPages} pages.`);
        } else {
          diffNotes.push(`Both documents have identical page count (${doc.numPages} pages).`);
        }

        if (file.size !== secondFile.size) {
          diffNotes.push(`File sizes differ: Doc A is ${(file.size / 1024).toFixed(1)} KB, Doc B is ${(secondFile.size / 1024).toFixed(1)} KB.`);
        }

        diffNotes.push(`Text vocabulary overlap: ${similarity}% match.`);

        setComparisonSummary({
          pagesA: doc.numPages,
          pagesB: docB.numPages,
          match: doc.numPages === docB.numPages && similarity === 100 && file.size === secondFile.size,
          textSimilarity: similarity,
          differenceNotes: diffNotes,
        });

        // Generate comparison report download
        const reportText = `PDF COMPARISON AUDIT REPORT\n=========================\nDocument A: ${file.name} (${doc.numPages} pages, ${(file.size / 1024).toFixed(1)} KB)\nDocument B: ${secondFile.name} (${docB.numPages} pages, ${(secondFile.size / 1024).toFixed(1)} KB)\n\nAudit Results:\n- Overall Match: ${doc.numPages === docB.numPages && similarity === 100 ? 'EXACT MATCH' : 'DIFFERENCES DETECTED'}\n- Vocabulary Similarity: ${similarity}%\n\nDetailed Notes:\n${diffNotes.map((n) => `• ${n}`).join('\n')}\n`;

        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`comparison-report-${base}-vs-${secondFile.name.replace(/\.[^/.]+$/, '')}.txt`);
      } else if (toolType === 'fill-form') {
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        if (fields.length > 0) {
          formFieldsList.forEach((ff) => {
            if (ff.value) {
              try {
                const tf = form.getTextField(ff.name);
                tf.setText(ff.value);
              } catch {
                // Not a textfield or different field type
              }
            }
          });
        }

        const bytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-filled-form.pdf`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Tool operation failed: ${error.message}`);
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
            {toolType === 'extract-text' && <ScanText className="h-7 w-7" />}
            {toolType === 'extract-images' && <ImageIcon className="h-7 w-7" />}
            {toolType === 'compare' && <GitCompare className="h-7 w-7" />}
            {toolType === 'fill-form' && <CheckSquare className="h-7 w-7" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {toolType === 'extract-text' && 'Choose a PDF to extract text'}
            {toolType === 'extract-images' && 'Choose a PDF to extract images'}
            {toolType === 'compare' && 'Choose primary PDF for comparison'}
            {toolType === 'fill-form' && 'Choose a PDF form to inspect & fill'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            100% in-browser processing. Document text and images are extracted directly in memory.
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
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB &bull; Loaded</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setSecondFile(null);
                setDownloadUrl(null);
                setExtractedResult(null);
                setComparisonSummary(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          {toolType === 'compare' && (
            <div className="space-y-4 mb-6">
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Second PDF Document to Compare
              </span>
              {secondFile ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-5 w-5 text-brand-600" />
                    <span className="text-sm font-medium text-slate-900">{secondFile.name}</span>
                    <span className="text-xs text-slate-500">({(secondFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecondFile(null)}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => secondFileInputRef.current?.click()}
                    className="rounded-lg border border-dashed border-slate-300 p-4 text-center hover:bg-slate-50 w-full text-sm text-slate-600"
                  >
                    Click to select second PDF file
                  </button>
                  <input
                    ref={secondFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setSecondFile(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              {comparisonSummary && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                  <h5 className="font-bold text-slate-900">Comparison Audit Results:</h5>
                  <p>
                    Status: <strong className={comparisonSummary.match ? 'text-teal-700' : 'text-amber-700'}>
                      {comparisonSummary.match ? 'Identical Documents' : 'Differences Detected'}
                    </strong>
                  </p>
                  <p>Similarity Index: <strong>{comparisonSummary.textSimilarity}%</strong></p>
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    {comparisonSummary.differenceNotes.map((note, idx) => (
                      <p key={idx} className="text-slate-600">&bull; {note}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {toolType === 'fill-form' && (
            <div className="space-y-4 mb-6">
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Interactive Form Fields ({formFieldsList.length} detected)
              </span>
              {formFieldsList.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {formFieldsList.map((ff, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700">{ff.name} ({ff.type})</label>
                      <input
                        type="text"
                        value={ff.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormFieldsList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                          );
                        }}
                        placeholder={`Value for ${ff.name}...`}
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 text-xs text-teal-900">
                  No interactive AcroForm fields were detected in this document. Saving will preserve all existing layers.
                </div>
              )}
            </div>
          )}

          {extractedResult && (
            <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Extracted Text Output:</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono bg-white p-3 rounded border border-slate-200">
                {extractedResult}
              </pre>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecute}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {toolType === 'extract-text' && 'Extract Text Now'}
                  {toolType === 'extract-images' && 'Extract Images (ZIP)'}
                  {toolType === 'compare' && 'Compare Two PDFs'}
                  {toolType === 'fill-form' && 'Save & Export Form'}
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
          <h4 className="text-xl font-bold text-slate-900">Task Completed Successfully!</h4>
          <p className="text-xs text-slate-600 mt-1">{resultNote ?? 'Your generated output is ready for download.'}</p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Output</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
