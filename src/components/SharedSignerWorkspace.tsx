'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SignatureCreator } from './SignatureCreator';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Calendar, 
  Type as TypeIcon, 
  Eye, 
  PenTool, 
  FileSignature
} from 'lucide-react';

export interface PlacedField {
  id: string;
  type: 'signature' | 'initials' | 'date' | 'text';
  page: number;
  x: number; // in canvas px
  y: number; // in canvas px
  width: number;
  height: number;
  content: string; // dataUrl for signature, text string for others
  label?: string;
}

interface SharedSignerWorkspaceProps {
  pdfArrayBuffer: ArrayBuffer;
  documentTitle: string;
  fileName: string;
  documentType: 'uploaded' | 'generated';
  disclosingParty?: string;
  receivingParty?: string;
  onReset: () => void;
}

export function SharedSignerWorkspace({
  pdfArrayBuffer,
  documentTitle,
  fileName,
  documentType,
  disclosingParty,
  receivingParty,
  onReset,
}: SharedSignerWorkspaceProps) {
  // Page rendering state
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 612, height: 792 });

  // Fields on the document
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Active Signature Creator Modal
  const [showSigCreator, setShowSigCreator] = useState<boolean>(false);
  const [customTextDraft, setCustomTextDraft] = useState<string>('Alex Mercer');
  const [initialsDraft, setInitialsDraft] = useState<string>('AM');

  // Dragging state
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Processing & Export State
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('signed-document.pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedToHistory, setSavedToHistory] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);


  // Inspect page count on initial load
  useEffect(() => {
    async function loadMeta() {
      try {
        const doc = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true });
        setNumPages(doc.getPageCount() || 1);
        const base = fileName.replace(/\.[^/.]+$/, '');
        setDownloadName(`signed-${base}.pdf`);
      } catch (err) {
        console.error('Failed to load PDF metadata:', err);
      }
    }
    loadMeta();
  }, [pdfArrayBuffer, fileName]);

  // Render PDF page using pdfjs-dist
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!canvasRef.current || !pdfArrayBuffer) return;
      setIsRendering(true);

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer.slice(0) });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled) return;

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        setPageSize({ width: viewport.width, height: viewport.height });

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfArrayBuffer, currentPage, scale]);

  // Add a field to current page
  const addField = (type: PlacedField['type'], content: string, width = 160, height = 55) => {
    const newField: PlacedField = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      page: currentPage,
      x: 60,
      y: Math.max(40, pageSize.height - 180),
      width,
      height,
      content,
      label: type === 'signature' ? 'Signature' : type === 'initials' ? 'Initials' : type === 'date' ? 'Date' : 'Text',
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Add Date field
  const handleAddDateField = () => {
    const today = new Date().toISOString().split('T')[0];
    addField('date', today, 120, 35);
  };

  // Add Initials field
  const handleAddInitialsField = () => {
    addField('initials', initialsDraft || 'AM', 80, 40);
  };

  // Add Text field
  const handleAddTextField = () => {
    addField('text', customTextDraft || 'Signer Name', 160, 35);
  };

  // Delete selected field
  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.stopPropagation();
    setSelectedFieldId(field.id);
    setDraggingFieldId(field.id);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: field.x,
      startY: field.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingFieldId) return;

    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== draggingFieldId) return f;
        let newX = dragStartRef.current.startX + deltaX;
        let newY = dragStartRef.current.startY + deltaY;

        newX = Math.max(0, Math.min(newX, pageSize.width - f.width));
        newY = Math.max(0, Math.min(newY, pageSize.height - f.height));

        return { ...f, x: newX, y: newY };
      })
    );
  };

  const handleMouseUp = () => {
    setDraggingFieldId(null);
  };

  // Final Embed & Generate PDF
  const handleExecuteSigning = async () => {
    if (fields.length === 0) {
      setErrorMessage('Please place at least one signature or field on the document before signing.');
      return;
    }

    setIsSigning(true);
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Process fields page by page
      for (const field of fields) {
        const targetPage = pdfDoc.getPage(field.page - 1);
        const { width: pWidth, height: pHeight } = targetPage.getSize();

        // Convert coordinates from current canvas size to actual PDF page dimensions
        const scaleX = pWidth / pageSize.width;
        const scaleY = pHeight / pageSize.height;

        const drawX = field.x * scaleX;
        const drawWidth = field.width * scaleX;
        const drawHeight = field.height * scaleY;
        // In PDF coordinates: (0,0) is bottom-left, whereas canvas is top-left
        const drawY = pHeight - ((field.y * scaleY) + drawHeight);

        if (field.type === 'signature') {
          let embeddedImage;
          if (field.content.startsWith('data:image/jpeg') || field.content.startsWith('data:image/jpg')) {
            embeddedImage = await pdfDoc.embedJpg(field.content);
          } else {
            embeddedImage = await pdfDoc.embedPng(field.content);
          }

          targetPage.drawImage(embeddedImage, {
            x: Math.max(0, drawX),
            y: Math.max(0, drawY),
            width: drawWidth,
            height: drawHeight,
          });
        } else if (field.type === 'initials') {
          targetPage.drawText(field.content, {
            x: Math.max(0, drawX + 4),
            y: Math.max(0, drawY + (drawHeight * 0.25)),
            size: 13,
            font: helveticaBold,
            color: rgb(0.1, 0.2, 0.5),
          });
        } else if (field.type === 'date') {
          targetPage.drawText(field.content, {
            x: Math.max(0, drawX + 4),
            y: Math.max(0, drawY + (drawHeight * 0.25)),
            size: 11,
            font: helveticaFont,
            color: rgb(0.2, 0.2, 0.2),
          });
        } else if (field.type === 'text') {
          targetPage.drawText(field.content, {
            x: Math.max(0, drawX + 4),
            y: Math.max(0, drawY + (drawHeight * 0.25)),
            size: 11,
            font: helveticaFont,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      }

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(signedBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

      // Save to user's server signing request history
      try {
        await fetch('/api/nda/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: documentTitle || 'Signed Non-Disclosure Agreement',
            documentType,
            status: 'signed',
            disclosingParty,
            receivingParty,
            fileName: downloadName,
            fileSize: blob.size,
            pageCount: numPages,
          }),
        });
        setSavedToHistory(true);
      } catch (recErr) {
        console.warn('Failed to record signing request history:', recErr);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Failed to sign document: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSigning(false);
    }
  };

  // Clean up URL on unmount
  useEffect(() => {
    return () => {
      if (signedPdfUrl) URL.revokeObjectURL(signedPdfUrl);
    };
  }, [signedPdfUrl]);

  return (
    <div className="space-y-6">
      {/* Document Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-brand-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              {documentTitle || fileName}
            </h3>
            <p className="text-xs text-slate-500">
              {numPages} {numPages === 1 ? 'Page' : 'Pages'} • {documentType === 'generated' ? 'Generated NDA' : 'Uploaded File'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Start Over</span>
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Completion View */}
      {signedPdfUrl ? (
        <div className="max-w-2xl mx-auto rounded-2xl border border-teal-300 bg-teal-50/70 p-8 sm:p-12 text-center space-y-6 shadow-sm animate-in fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
            <CheckCircle className="h-10 w-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Document Signed &amp; Executed!
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Your electronic signature, initials, and date fields have been securely flattened into the PDF document.
            </p>
            {savedToHistory && (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-800 bg-teal-100 px-3 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" /> Recorded in your Signing History
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href={signedPdfUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Signed PDF</span>
            </a>

            <a
              href={signedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Eye className="h-4 w-4" />
              <span>Preview in New Tab</span>
            </a>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Sign Another Document</span>
            </button>
          </div>
        </div>
      ) : (
        /* Document Signing Canvas & Tools */
        <div className="space-y-4">
          {/* Field Creation Toolbar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Add Signature &amp; Execution Fields
                </h4>
                <p className="text-[11px] text-slate-500">
                  Click a button to add a field, then drag and position it anywhere on page {currentPage}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSigning}
                  onClick={handleExecuteSigning}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {isSigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Embedding Fields...</span>
                    </>
                  ) : (
                    <>
                      <FileSignature className="h-4 w-4" />
                      <span>Sign &amp; Finalize PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSigCreator(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>+ Create &amp; Add Signature</span>
              </button>

              <button
                type="button"
                onClick={handleAddDateField}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>+ Add Date</span>
              </button>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={initialsDraft}
                  onChange={(e) => setInitialsDraft(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-14 rounded border border-slate-300 px-2 py-1 text-xs uppercase font-mono text-center"
                  placeholder="Initials"
                />
                <button
                  type="button"
                  onClick={handleAddInitialsField}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <span>+ Add Initials</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customTextDraft}
                  onChange={(e) => setCustomTextDraft(e.target.value)}
                  className="w-36 rounded border border-slate-300 px-2 py-1 text-xs"
                  placeholder="Full name or Title"
                />
                <button
                  type="button"
                  onClick={handleAddTextField}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <TypeIcon className="h-3.5 w-3.5" />
                  <span>+ Add Text</span>
                </button>
              </div>
            </div>
          </div>

          {/* Signature Creator Modal */}
          {showSigCreator && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">Adopt Electronic Signature</h3>
                  <button
                    type="button"
                    onClick={() => setShowSigCreator(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1"
                  >
                    Close
                  </button>
                </div>
                <div className="p-4">
                  <SignatureCreator
                    onSignatureReady={(dataUrl) => {
                      addField('signature', dataUrl, 170, 60);
                      setShowSigCreator(false);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Canvas & PDF Document Viewer */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Page Navigation:</span>
                <button
                  type="button"
                  disabled={currentPage <= 1 || isRendering}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
                  {currentPage} of {numPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= numPages || isRendering}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
                  className="rounded p-1 text-slate-600 hover:bg-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-slate-600 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
                  className="rounded p-1 text-slate-600 hover:bg-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Canvas Area */}
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative flex items-center justify-center p-6 bg-slate-100/70 overflow-auto min-h-[500px] max-h-[750px] select-none"
            >
              {isRendering && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Rendering Page {currentPage}...</p>
                </div>
              )}

              <div
                className="relative shadow-md border border-slate-300 bg-white inline-block"
                style={{ width: pageSize.width, height: pageSize.height }}
              >
                <canvas ref={canvasRef} className="block w-full h-full" />

                {/* Render Placed Fields on Current Page */}
                {fields
                  .filter((f) => f.page === currentPage)
                  .map((field) => {
                    const isSelected = selectedFieldId === field.id;
                    const isBeingDragged = draggingFieldId === field.id;

                    return (
                      <div
                        key={field.id}
                        onMouseDown={(e) => handleMouseDown(e, field)}
                        style={{
                          position: 'absolute',
                          left: `${field.x}px`,
                          top: `${field.y}px`,
                          width: `${field.width}px`,
                          height: `${field.height}px`,
                          cursor: isBeingDragged ? 'grabbing' : 'grab',
                        }}
                        className={`group p-1.5 rounded transition-shadow select-none border-2 ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/70 shadow-md'
                            : 'border-dashed border-teal-500 bg-teal-50/50 hover:border-teal-700'
                        }`}
                      >
                        {/* Header bar with tag and delete */}
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 pb-0.5">
                          <span className="uppercase text-teal-800 tracking-wider">
                            {field.label}
                          </span>
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => handleDeleteField(field.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Content render */}
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                          {field.type === 'signature' ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={field.content}
                              alt="Signature field"
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <span className="text-xs font-mono font-semibold text-slate-800 truncate px-1">
                              {field.content}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
