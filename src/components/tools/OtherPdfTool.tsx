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
import { diffLines, textItemsToRows } from '@/lib/pdf-export-formats';
import { openPdfDocument } from '@/lib/pdfjs-client';

interface OtherPdfToolProps {
  toolType: 'extract-text' | 'extract-images' | 'compare' | 'fill-form';
}

type FormFieldKind = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other';
interface FormFieldInfo {
  name: string;
  value: string;
  kind: FormFieldKind;
  options: string[];
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
  const [formFieldsList, setFormFieldsList] = useState<FormFieldInfo[]>([]);
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
        const { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        // instanceof, not constructor names: class names are minified in production builds.
        const fieldDetails: FormFieldInfo[] = fields.map((f) => {
          const name = f.getName();
          if (f instanceof PDFTextField) return { name, kind: 'text', value: f.getText() || '', options: [] };
          if (f instanceof PDFCheckBox) return { name, kind: 'checkbox', value: f.isChecked() ? 'true' : '', options: [] };
          if (f instanceof PDFDropdown || f instanceof PDFOptionList)
            return { name, kind: 'dropdown', value: f.getSelected()[0] || '', options: f.getOptions() };
          if (f instanceof PDFRadioGroup) return { name, kind: 'radio', value: f.getSelected() || '', options: f.getOptions() };
          return { name, kind: 'other', value: '', options: [] };
        });
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

        // Read each page as lines (rebuilt from text positions), then diff page against page.
        const pageLines = async (d: typeof doc, n: number) => {
          const pg = await d.getPage(n);
          const tc = await pg.getTextContent();
          const items = tc.items
            .map((it: unknown) => it as { str?: string; transform?: number[]; width?: number; height?: number })
            .filter((it) => typeof it.str === 'string' && Array.isArray(it.transform))
            .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5], width: it.width || 0, height: it.height || 10 }));
          return textItemsToRows(items).map((r) => r.join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
        };

        const maxPages = Math.max(doc.numPages, docB.numPages);
        let same = 0;
        let totalA = 0;
        let totalB = 0;
        const diffNotes: string[] = [];
        const reportPages: string[] = [];
        if (doc.numPages !== docB.numPages) {
          diffNotes.push(`Page counts differ: ${file.name} has ${doc.numPages}, ${secondFile.name} has ${docB.numPages}.`);
        }
        for (let n = 1; n <= maxPages; n++) {
          const a = n <= doc.numPages ? await pageLines(doc, n) : [];
          const b = n <= docB.numPages ? await pageLines(docB, n) : [];
          totalA += a.length;
          totalB += b.length;
          if (n > doc.numPages) {
            diffNotes.push(`Page ${n} only exists in the second file.`);
            reportPages.push(`Page ${n}: only in second file\n${b.map((l) => `+ ${l}`).join('\n')}`);
            continue;
          }
          if (n > docB.numPages) {
            diffNotes.push(`Page ${n} only exists in the first file.`);
            reportPages.push(`Page ${n}: only in first file\n${a.map((l) => `- ${l}`).join('\n')}`);
            continue;
          }
          const ops = diffLines(a, b);
          same += ops.filter((o) => o.type === 'same').length;
          const removed = ops.filter((o) => o.type === 'removed');
          const added = ops.filter((o) => o.type === 'added');
          if (removed.length || added.length) {
            const sample = [...removed.slice(0, 2).map((o) => `removed "${o.line.slice(0, 80)}"`), ...added.slice(0, 2).map((o) => `added "${o.line.slice(0, 80)}"`)];
            diffNotes.push(`Page ${n}: ${sample.join('; ')}${removed.length + added.length > 4 ? ' …' : ''}`);
            reportPages.push(`Page ${n}\n${ops.filter((o) => o.type !== 'same').map((o) => `${o.type === 'removed' ? '-' : '+'} ${o.line}`).join('\n')}`);
          }
        }
        const similarity = totalA + totalB > 0 ? Math.round(((2 * same) / (totalA + totalB)) * 100) : 100;
        const identical = diffNotes.length === 0;
        if (identical) diffNotes.push(`No text differences found across ${doc.numPages} page${doc.numPages === 1 ? '' : 's'}. Only the text is compared, not images or layout.`);

        setComparisonSummary({
          pagesA: doc.numPages,
          pagesB: docB.numPages,
          match: identical,
          textSimilarity: similarity,
          differenceNotes: diffNotes.slice(0, 12),
        });

        const reportText = `PDF COMPARISON REPORT\n=====================\nFirst file:  ${file.name} (${doc.numPages} pages)\nSecond file: ${secondFile.name} (${docB.numPages} pages)\nMatching lines: ${similarity}%\nResult: ${identical ? 'No text differences' : 'Differences found'}\n\nLines starting with - are only in the first file, + only in the second.\n\n${reportPages.join('\n\n') || 'No differences.'}\n`;

        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`comparison-report-${base}-vs-${secondFile.name.replace(/\.[^/.]+$/, '')}.txt`);
      } else if (toolType === 'fill-form') {
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const form = pdfDoc.getForm();
        const skipped: string[] = [];
        formFieldsList.forEach((ff) => {
          try {
            if (ff.kind === 'text') form.getTextField(ff.name).setText(ff.value || undefined);
            else if (ff.kind === 'checkbox') {
              const cb = form.getCheckBox(ff.name);
              if (ff.value === 'true') cb.check();
              else cb.uncheck();
            } else if (ff.kind === 'dropdown' && ff.value) {
              try {
                form.getDropdown(ff.name).select(ff.value);
              } catch {
                form.getOptionList(ff.name).select(ff.value);
              }
            } else if (ff.kind === 'radio' && ff.value) form.getRadioGroup(ff.name).select(ff.value);
          } catch {
            skipped.push(ff.name);
          }
        });
        setResultNote(
          skipped.length
            ? `Saved. ${skipped.length} field${skipped.length === 1 ? '' : 's'} could not be filled: ${skipped.slice(0, 3).join(', ')}.`
            : 'All fields saved. The form stays fillable; use Flatten PDF if you want to lock it.'
        );

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
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#CFCBFF] bg-white p-8 sm:p-12 text-center hover:border-brand-600 hover:bg-brand-50 transition"
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
                  <h5 className="font-bold text-slate-900">Comparison results</h5>
                  <p>
                    Status: <strong className={comparisonSummary.match ? 'text-teal-700' : 'text-amber-700'}>
                      {comparisonSummary.match ? 'Same text' : 'Differences found'}
                    </strong>
                  </p>
                  <p>Matching lines: <strong>{comparisonSummary.textSimilarity}%</strong></p>
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
                      <label htmlFor={`ff-${idx}`} className="text-xs font-medium text-slate-700">
                        {ff.name}
                      </label>
                      {ff.kind === 'checkbox' ? (
                        <input
                          id={`ff-${idx}`}
                          type="checkbox"
                          checked={ff.value === 'true'}
                          onChange={(e) => {
                            const val = e.target.checked ? 'true' : '';
                            setFormFieldsList((prev) => prev.map((item, i) => (i === idx ? { ...item, value: val } : item)));
                          }}
                          className="h-5 w-5 rounded border-slate-300 text-brand-600"
                        />
                      ) : ff.kind === 'dropdown' || ff.kind === 'radio' ? (
                        <select
                          id={`ff-${idx}`}
                          value={ff.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormFieldsList((prev) => prev.map((item, i) => (i === idx ? { ...item, value: val } : item)));
                          }}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                        >
                          <option value="">Choose…</option>
                          {ff.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : ff.kind === 'other' ? (
                        <p className="text-xs text-slate-500">Signature or button field, kept as it is.</p>
                      ) : (
                        <input
                          id={`ff-${idx}`}
                          type="text"
                          value={ff.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormFieldsList((prev) => prev.map((item, i) => (i === idx ? { ...item, value: val } : item)));
                          }}
                          placeholder={`Value for ${ff.name}...`}
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      )}
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
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
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
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
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
