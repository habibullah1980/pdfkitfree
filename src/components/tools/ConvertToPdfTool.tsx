'use client';

import { friendlyPdfError } from '@/lib/friendly-errors';
import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { makeSafeText } from '@/lib/pdf-safe-text';
import JSZip from 'jszip';
import { 
  Upload, 
  Trash2, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Presentation
} from 'lucide-react';

interface ConvertToPdfToolProps {
  sourceType: 'image' | 'word' | 'excel' | 'powerpoint' | 'html';
}

export function ConvertToPdfTool({ sourceType }: ConvertToPdfToolProps) {
  const [files, setFiles] = useState<{ id: string; file: File; previewUrl?: string }[]>([]);
  const [htmlContent, setHtmlContent] = useState<string>(
    '<h1>FreePDFKit Document</h1>\n<p>Export clean, formatted content directly into standard PDF format with full client-side privacy.</p>'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('converted-document.pdf');
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

  const getAcceptTypes = () => {
    switch (sourceType) {
      case 'image':
        return 'image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif';
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

  const convertImageToJpegBytes = async (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to encode image to blob'));
              return;
            }
            const buf = await blob.arrayBuffer();
            resolve(new Uint8Array(buf));
          },
          'image/jpeg',
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to decode image file: ${file.name}`));
      };
      img.src = objectUrl;
    });
  };

  // Extract clean paragraphs from DOCX or plain text
  const extractWordParagraphs = async (file: File): Promise<string[]> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.docx')) {
      try {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const docXmlFile = zip.file('word/document.xml');
        if (docXmlFile) {
          const xml = await docXmlFile.async('text');
          const paragraphs: string[] = [];
          const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
          let match;
          while ((match = pRegex.exec(xml)) !== null) {
            const tRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
            let tMatch;
            let pText = '';
            while ((tMatch = tRegex.exec(match[1])) !== null) {
              pText += tMatch[1];
            }
            if (pText.trim()) paragraphs.push(pText.trim());
          }
          if (paragraphs.length > 0) return paragraphs;
        }
      } catch {
        // Fallback to text reading if zip parsing fails
      }
    }
    const rawText = await file.text();
    return rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  };

  // Extract table rows from XLSX or CSV
  const extractExcelRows = async (file: File): Promise<string[][]> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.xlsx')) {
      try {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
        const byTag = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS('*', tag));

        // Shared strings: one <si> per entry; rich text splits an entry into several <t> runs.
        const sharedStrings: string[] = [];
        const ssFile = zip.file('xl/sharedStrings.xml');
        if (ssFile) {
          const ssDoc = parse(await ssFile.async('text'));
          for (const si of byTag(ssDoc, 'si')) {
            sharedStrings.push(byTag(si, 't').map((t) => t.textContent || '').join(''));
          }
        }

        // First worksheet in workbook order (not always sheet1.xml).
        let sheetPath = 'xl/worksheets/sheet1.xml';
        const wbFile = zip.file('xl/workbook.xml');
        const relsFile = zip.file('xl/_rels/workbook.xml.rels');
        if (wbFile && relsFile) {
          const firstSheet = byTag(parse(await wbFile.async('text')), 'sheet')[0];
          const rid = firstSheet?.getAttribute('r:id') || firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
          const rel = byTag(parse(await relsFile.async('text')), 'Relationship').find((r) => r.getAttribute('Id') === rid);
          const target = rel?.getAttribute('Target');
          if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
        }

        const sheetFile = zip.file(sheetPath) || zip.file('xl/worksheets/sheet1.xml');
        if (sheetFile) {
          const sheetDoc = parse(await sheetFile.async('text'));
          const colIndex = (ref: string | null, fallback: number) => {
            const letters = (ref || '').match(/^[A-Z]+/)?.[0];
            if (!letters) return fallback;
            return letters.split('').reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
          };
          const rows: string[][] = [];
          for (const row of byTag(sheetDoc, 'row')) {
            const rowCells: string[] = [];
            byTag(row, 'c').forEach((c, i) => {
              const type = c.getAttribute('t');
              const v = byTag(c, 'v')[0]?.textContent ?? '';
              let value = v;
              if (type === 's') value = sharedStrings[parseInt(v, 10)] ?? '';
              else if (type === 'inlineStr') value = byTag(c, 't').map((t) => t.textContent || '').join('');
              else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
              const idx = colIndex(c.getAttribute('r'), i);
              while (rowCells.length < idx) rowCells.push('');
              rowCells[idx] = value;
            });
            if (rowCells.some((c) => c.trim().length > 0)) {
              rows.push(rowCells);
            }
          }
          if (rows.length > 0) return rows;
        }
      } catch {
        // Fallback to text csv parsing
      }
    }

    const text = await file.text();
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));
  };

  // Extract presentation slides from PPTX
  const extractPptxSlides = async (file: File): Promise<string[][]> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pptx')) {
      try {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const slideFiles = Object.keys(zip.files)
          .filter((f) => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
          .sort();

        const slides: string[][] = [];
        for (const sf of slideFiles) {
          const xml = await zip.files[sf].async('text');
          const lines: string[] = [];
          const tRegex = /<a:t\b[^>]*>([^<]*)<\/a:t>/g;
          let match;
          while ((match = tRegex.exec(xml)) !== null) {
            if (match[1].trim()) lines.push(match[1].trim());
          }
          if (lines.length > 0) slides.push(lines);
        }
        if (slides.length > 0) return slides;
      } catch {
        // Fallback
      }
    }
    const text = await file.text();
    return [text.split(/\r?\n/).slice(0, 30)];
  };

  const handleConvert = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const doc = await PDFDocument.create();
      const baseName = files.length > 0 ? files[0].file.name.replace(/\.[^/.]+$/, '') : 'converted';

      if (sourceType === 'image') {
        if (files.length === 0) {
          setErrorMessage('Please add at least one image file.');
          setIsProcessing(false);
          return;
        }

        for (const item of files) {
          const jpegBytes = await convertImageToJpegBytes(item.file);
          const embeddedImage = await doc.embedJpg(jpegBytes);
          const { width, height } = embeddedImage.scale(1);

          // Standard A4 aspect fit
          const a4Width = 595.28;
          const a4Height = 841.89;
          const margin = 36;
          const maxWidth = a4Width - margin * 2;
          const maxHeight = a4Height - margin * 2;

          let renderW = width;
          let renderH = height;
          if (renderW > maxWidth || renderH > maxHeight) {
            const scaleRatio = Math.min(maxWidth / renderW, maxHeight / renderH);
            renderW = renderW * scaleRatio;
            renderH = renderH * scaleRatio;
          }

          const page = doc.addPage([a4Width, a4Height]);
          const x = (a4Width - renderW) / 2;
          const y = (a4Height - renderH) / 2;

          page.drawImage(embeddedImage, {
            x,
            y,
            width: renderW,
            height: renderH,
          });
        }
      } else if (sourceType === 'word') {
        if (files.length === 0) {
          setErrorMessage('Please select a Word or text file to convert.');
          setIsProcessing(false);
          return;
        }

        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const safe = makeSafeText(font);
        const paragraphs = (await extractWordParagraphs(files[0].file)).map(safe);

        const a4Width = 595.28;
        const a4Height = 841.89;
        const margin = 50;
        const lineHeight = 16;
        let currentPage = doc.addPage([a4Width, a4Height]);
        let currentY = a4Height - margin;

        // Document Title
        currentPage.drawText(safe(files[0].file.name.replace(/\.[^/.]+$/, '')), {
          x: margin,
          y: currentY,
          size: 16,
          font: fontBold,
          color: rgb(0.1, 0.2, 0.5),
        });
        currentY -= 30;

        for (const p of paragraphs) {
          // Word-wrap paragraph
          const words = p.split(/\s+/);
          let currentLine = '';

          for (const w of words) {
            const testLine = currentLine ? `${currentLine} ${w}` : w;
            const textWidth = font.widthOfTextAtSize(testLine, 10.5);

            if (textWidth > a4Width - margin * 2 && currentLine) {
              if (currentY < margin + lineHeight) {
                currentPage = doc.addPage([a4Width, a4Height]);
                currentY = a4Height - margin;
              }
              currentPage.drawText(currentLine, {
                x: margin,
                y: currentY,
                size: 10.5,
                font,
                color: rgb(0.15, 0.15, 0.15),
              });
              currentY -= lineHeight;
              currentLine = w;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine) {
            if (currentY < margin + lineHeight) {
              currentPage = doc.addPage([a4Width, a4Height]);
              currentY = a4Height - margin;
            }
            currentPage.drawText(currentLine, {
              x: margin,
              y: currentY,
              size: 10.5,
              font,
              color: rgb(0.15, 0.15, 0.15),
            });
            currentY -= lineHeight + 8; // Paragraph spacing
          }
        }
      } else if (sourceType === 'excel') {
        if (files.length === 0) {
          setErrorMessage('Please select a spreadsheet file (.xlsx, .csv).');
          setIsProcessing(false);
          return;
        }

        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const safe = makeSafeText(font);
        const rows = (await extractExcelRows(files[0].file)).map((r) => r.map(safe));

        // Landscape A4 for spreadsheets
        const pageW = 841.89;
        const pageH = 595.28;
        const margin = 40;
        let currentPage = doc.addPage([pageW, pageH]);
        let currentY = pageH - margin;

        currentPage.drawText(safe(`Spreadsheet: ${files[0].file.name}`), {
          x: margin,
          y: currentY,
          size: 14,
          font: fontBold,
          color: rgb(0.1, 0.3, 0.4),
        });
        currentY -= 24;

        const maxCols = Math.min(8, Math.max(...rows.map((r) => r.length), 1));
        const colWidth = (pageW - margin * 2) / maxCols;

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx];
          if (currentY < margin + 20) {
            currentPage = doc.addPage([pageW, pageH]);
            currentY = pageH - margin;
          }

          const isHeader = rIdx === 0;
          // Row background
          if (isHeader) {
            currentPage.drawRectangle({
              x: margin,
              y: currentY - 4,
              width: pageW - margin * 2,
              height: 18,
              color: rgb(0.9, 0.94, 0.98),
            });
          }

          for (let cIdx = 0; cIdx < maxCols; cIdx++) {
            const cellText = (row[cIdx] || '').slice(0, 24);
            currentPage.drawText(cellText, {
              x: margin + cIdx * colWidth + 4,
              y: currentY,
              size: 9,
              font: isHeader ? fontBold : font,
              color: rgb(0.1, 0.1, 0.1),
            });
          }
          currentY -= 20;
        }
      } else if (sourceType === 'powerpoint') {
        if (files.length === 0) {
          setErrorMessage('Please select a PowerPoint presentation file (.pptx).');
          setIsProcessing(false);
          return;
        }

        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const safe = makeSafeText(font);
        const slides = (await extractPptxSlides(files[0].file)).map((sl) => sl.map(safe));

        // Standard 16:9 widescreen presentation slide (960 x 540 pt)
        const slideW = 960;
        const slideH = 540;

        for (let sIdx = 0; sIdx < slides.length; sIdx++) {
          const slide = slides[sIdx];
          const page = doc.addPage([slideW, slideH]);

          // Header band
          page.drawRectangle({
            x: 0,
            y: slideH - 60,
            width: slideW,
            height: 60,
            color: rgb(0.08, 0.38, 0.65),
          });

          const title = slide[0] || `Slide ${sIdx + 1}`;
          page.drawText(title.slice(0, 60), {
            x: 50,
            y: slideH - 40,
            size: 20,
            font: fontBold,
            color: rgb(1, 1, 1),
          });

          let textY = slideH - 110;
          for (let lIdx = 1; lIdx < slide.length; lIdx++) {
            if (textY > 50) {
              page.drawText(`• ${slide[lIdx].slice(0, 90)}`, {
                x: 60,
                y: textY,
                size: 14,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });
              textY -= 28;
            }
          }
        }
      } else if (sourceType === 'html') {
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const safe = makeSafeText(font);

        const a4Width = 595.28;
        const a4Height = 841.89;
        const margin = 50;
        const page = doc.addPage([a4Width, a4Height]);

        let plainText = htmlContent;
        if (typeof window !== 'undefined') {
          // DOMParser builds an inert document: scripts and event handlers in the HTML never run
          const parsed = new DOMParser().parseFromString(htmlContent, 'text/html');
          parsed.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove());
          plainText = parsed.body?.innerText || parsed.body?.textContent || 'Exported HTML Document';
        }
        plainText = safe(plainText);

        const lines = plainText.split('\n').filter((l) => l.trim().length > 0);
        let currentY = a4Height - margin;

        lines.forEach((line, idx) => {
          if (currentY > margin) {
            const isHeading = idx === 0 || line.length < 30;
            page.drawText(line.slice(0, 80), {
              x: margin,
              y: currentY,
              size: isHeading ? 14 : 10.5,
              font: isHeading ? fontBold : font,
              color: isHeading ? rgb(0.1, 0.2, 0.6) : rgb(0.2, 0.2, 0.2),
            });
            currentY -= isHeading ? 24 : 16;
          }
        });
      }

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`${baseName}-converted.pdf`);
    } catch (err: unknown) {
      setErrorMessage(friendlyPdfError(err, 'The conversion did not finish.').message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {sourceType === 'html' ? (
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Enter or Paste HTML Code
          </label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-300 p-4 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConvert}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
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
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#CFCBFF] bg-white p-8 sm:p-12 text-center hover:border-brand-600 hover:bg-brand-50 transition"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm border border-brand-100 mb-4">
            {sourceType === 'image' && <Upload className="h-7 w-7" />}
            {sourceType === 'word' && <FileText className="h-7 w-7" />}
            {sourceType === 'excel' && <FileSpreadsheet className="h-7 w-7" />}
            {sourceType === 'powerpoint' && <Presentation className="h-7 w-7" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {sourceType === 'image' && 'Select Image files (JPG, PNG, WebP, BMP)'}
            {sourceType === 'word' && 'Select Word Document (.docx, .txt)'}
            {sourceType === 'excel' && 'Select Excel Spreadsheet (.xlsx, .csv)'}
            {sourceType === 'powerpoint' && 'Select PowerPoint Presentation (.pptx)'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Direct client-side conversion. Files are parsed securely in your browser.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <Upload className="h-4 w-4" />
              <span>Select File</span>
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
        <div className="rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-6 shadow-lift sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h4 className="text-base font-semibold text-slate-900">Selected Source Files ({files.length})</h4>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setDownloadUrl(null);
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove All
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {files.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center gap-3">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.file.name} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <FileText className="h-6 w-6 text-brand-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.file.name}</p>
                    <p className="text-xs text-slate-500">{(item.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

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
          <h4 className="text-xl font-bold text-slate-900">Conversion Successful!</h4>
          <p className="text-xs text-slate-600 mt-1">Your document has been compiled into standard PDF format.</p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF File</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
