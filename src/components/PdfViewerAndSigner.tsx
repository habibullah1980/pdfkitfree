'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Loader2, 
  Maximize2
} from 'lucide-react';

interface PdfViewerAndSignerProps {
  pdfArrayBuffer: ArrayBuffer;
  numPages: number;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  signatureImage: string | null;
  onPlaceSignature: (config: {
    pageNumber: number;
    normX: number; // 0 to 1 relative to page width
    normY: number; // 0 to 1 relative to page height
    normWidth: number;
    normHeight: number;
    includeDate: boolean;
    dateText: string;
    includeInitials: boolean;
    initialsText: string;
  }) => void;
}

export function PdfViewerAndSigner({
  pdfArrayBuffer,
  numPages,
  currentPage,
  onPageChange,
  signatureImage,
  onPlaceSignature,
}: PdfViewerAndSignerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1.2);
  const [isRendering, setIsRendering] = useState(false);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 600, height: 800 });

  // Signature placement overlay state (coordinates in rendered canvas pixels)
  const [sigPosition, setSigPosition] = useState<{ x: number; y: number }>({ x: 60, y: 120 });
  const [sigWidth, setSigWidth] = useState(160);
  const [sigHeight, setSigHeight] = useState(60);
  const [includeDate, setIncludeDate] = useState(true);
  const [dateText, setDateText] = useState(new Date().toISOString().split('T')[0]);
  const [includeInitials, setIncludeInitials] = useState(false);
  const [initialsText, setInitialsText] = useState('AM');

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Render PDF page using pdfjs-dist
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!canvasRef.current || !pdfArrayBuffer) return;

      setIsRendering(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        // Load document
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

        // Position signature near bottom of page initially if default
        setSigPosition((prev) => {
          if (prev.x === 60 && prev.y === 120) {
            return { x: 50, y: Math.max(50, viewport.height - 180) };
          }
          return prev;
        });

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Failed to render PDF page via PDF.js:', err);
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

  // Handle Dragging signature
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: sigPosition.x,
      startY: sigPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    let newX = dragStartRef.current.startX + deltaX;
    let newY = dragStartRef.current.startY + deltaY;

    // Bounds checking
    newX = Math.max(0, Math.min(newX, pageSize.width - sigWidth));
    newY = Math.max(0, Math.min(newY, pageSize.height - sigHeight));

    setSigPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Sync placement to parent
  useEffect(() => {
    if (signatureImage && pageSize.width > 0 && pageSize.height > 0) {
      onPlaceSignature({
        pageNumber: currentPage,
        normX: sigPosition.x / pageSize.width,
        normY: sigPosition.y / pageSize.height,
        normWidth: sigWidth / pageSize.width,
        normHeight: sigHeight / pageSize.height,
        includeDate,
        dateText,
        includeInitials,
        initialsText,
      });
    }
  }, [
    sigPosition,
    sigWidth,
    sigHeight,
    pageSize,
    currentPage,
    signatureImage,
    includeDate,
    dateText,
    includeInitials,
    initialsText,
    onPlaceSignature,
  ]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Top Toolbar: Navigation & Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Page Navigation:</span>
          <button
            type="button"
            disabled={currentPage <= 1 || isRendering}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
            {currentPage} of {numPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= numPages || isRendering}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
              className="rounded p-1 text-slate-600 hover:bg-slate-200"
              title="Zoom out"
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
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Signature Placement Controls & Toggles */}
      {signatureImage && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-brand-50/60 px-4 py-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-900">Active Page for Signature:</span>
            <span className="rounded bg-brand-600 px-2 py-0.5 font-bold text-white">
              Page {currentPage}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              (Drag signature box anywhere on this page)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Signature scale slider */}
            <div className="flex items-center gap-1.5">
              <span>Size:</span>
              <input
                type="range"
                min="100"
                max="280"
                value={sigWidth}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setSigWidth(w);
                  setSigHeight(Math.round(w * 0.38));
                }}
                className="w-20 cursor-pointer accent-brand-600"
              />
            </div>

            {/* Date toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium">Stamp Date</span>
            </label>

            {includeDate && (
              <input
                type="text"
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800"
              />
            )}

            {/* Initials toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInitials}
                onChange={(e) => setIncludeInitials(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="font-medium">Initials</span>
            </label>

            {includeInitials && (
              <input
                type="text"
                value={initialsText}
                onChange={(e) => setInitialsText(e.target.value)}
                className="w-14 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800 uppercase"
                maxLength={4}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative flex items-center justify-center p-4 sm:p-8 bg-slate-100/70 overflow-auto min-h-[460px] max-h-[720px] select-none"
      >
        {isRendering && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Rendering Page {currentPage} with PDF.js...</p>
          </div>
        )}

        <div
          className="relative shadow-lg border border-slate-300 bg-white inline-block transition-all"
          style={{ width: pageSize.width, height: pageSize.height }}
        >
          <canvas ref={canvasRef} className="block w-full h-full" />

          {/* Draggable Signature Overlay on current page */}
          {signatureImage && (
            <div
              onMouseDown={handleMouseDown}
              style={{
                position: 'absolute',
                left: `${sigPosition.x}px`,
                top: `${sigPosition.y}px`,
                width: `${sigWidth}px`,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              className="group border-2 border-dashed border-teal-500 bg-teal-50/40 p-2 rounded shadow-md transition-shadow hover:shadow-lg hover:border-teal-600"
            >
              <div className="flex items-center justify-between pb-1 border-b border-teal-200/60 mb-1">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                  <Maximize2 className="h-2.5 w-2.5" />
                  Drag to Place
                </span>
                <span className="text-[9px] text-teal-700 bg-teal-100 px-1 rounded">
                  P.{currentPage}
                </span>
              </div>

              {/* Signature Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureImage}
                alt="Signature overlay"
                className="w-full object-contain pointer-events-none"
                style={{ maxHeight: `${sigHeight}px` }}
              />

              {/* Optional Date & Initials Preview */}
              {(includeDate || includeInitials) && (
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-700 font-mono pt-1 border-t border-teal-200/60">
                  {includeDate && <span>Date: {dateText}</span>}
                  {includeInitials && <span>Initials: {initialsText}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
