'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenTool, Type, Image as ImageIcon, RotateCcw, Check } from 'lucide-react';

interface SignatureCreatorProps {
  onSignatureReady: (dataUrl: string) => void;
}

export function SignatureCreator({ onSignatureReady }: SignatureCreatorProps) {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Draw state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e3a8a'); // dark blue

  // Type state
  const [typedName, setTypedName] = useState('Alex Mercer');
  const [selectedFont, setSelectedFont] = useState<'font1' | 'font2' | 'font3'>('font1');

  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        // Set actual canvas resolution
        canvas.width = 500;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 2.5;
        }
      }
    }
  }, [tab]);

  // Handle Drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.strokeStyle = penColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
      // Prevent scrolling while drawing on mobile touch devices
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  // Convert Typed Signature to transparent PNG
  const generateTypedSignatureDataUrl = (): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 500;
    tempCanvas.height = 150;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.fillStyle = penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontStyle = 'italic 44px "Brush Script MT", cursive, sans-serif';
    if (selectedFont === 'font2') {
      fontStyle = 'italic 40px "Segoe Script", "Lucida Handwriting", cursive';
    } else if (selectedFont === 'font3') {
      fontStyle = 'italic bold 38px "Great Vibes", "Georgia", serif';
    }

    ctx.font = fontStyle;
    ctx.fillText(typedName.trim() || 'Signature', 250, 75);

    // Optional decorative underline
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, 105);
    ctx.bezierCurveTo(180, 115, 320, 95, 430, 105);
    ctx.stroke();

    return tempCanvas.toDataURL('image/png');
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleApplySignature = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('Please draw your signature first.');
        return;
      }
      onSignatureReady(canvas.toDataURL('image/png'));
    } else if (tab === 'type') {
      if (!typedName.trim()) {
        alert('Please enter your name.');
        return;
      }
      const dataUrl = generateTypedSignatureDataUrl();
      onSignatureReady(dataUrl);
    } else if (tab === 'upload') {
      if (!uploadedImage) {
        alert('Please select an image file first.');
        return;
      }
      onSignatureReady(uploadedImage);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Create or Choose Signature</h3>
          <p className="text-xs text-slate-500">
            Adopt an electronic signature to place directly on your document.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTab('draw')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === 'draw'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('type')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === 'type'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            <span>Type</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === 'upload'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Color options for draw and type */}
      {tab !== 'upload' && (
        <div className="flex items-center gap-3 mb-4 text-xs font-medium text-slate-600">
          <span>Ink Color:</span>
          <div className="flex items-center gap-2">
            {[
              { label: 'Navy Blue', hex: '#1e3a8a' },
              { label: 'Classic Black', hex: '#0f172a' },
              { label: 'Dark Teal', hex: '#0f766e' },
            ].map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setPenColor(c.hex)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-xs transition ${
                  penColor === c.hex
                    ? 'border-brand-500 bg-brand-50 font-bold text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: c.hex }}
                />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1. DRAW TAB */}
      {tab === 'draw' && (
        <div className="space-y-3">
          <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 touch-none flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full max-w-[500px] h-[160px] cursor-crosshair bg-transparent"
            />
            <div className="pointer-events-none absolute bottom-4 text-center">
              {!hasDrawn && (
                <span className="text-xs text-slate-400 select-none">
                  Sign with your mouse, trackpad, or finger here
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Canvas</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. TYPE TAB */}
      {tab === 'type' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Signature Style
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'font1', name: 'Fluid Cursive', sampleFont: 'italic 28px "Brush Script MT", cursive' },
                { id: 'font2', name: 'Classic Script', sampleFont: 'italic 24px "Segoe Script", cursive' },
                { id: 'font3', name: 'Executive Flow', sampleFont: 'italic bold 22px "Great Vibes", Georgia, serif' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFont(f.id as 'font1' | 'font2' | 'font3')}
                  className={`rounded-lg border p-3 text-center transition ${
                    selectedFont === f.id
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p
                    className="truncate text-lg"
                    style={{
                      font: f.sampleFont,
                      color: penColor,
                    }}
                  >
                    {typedName.trim() || 'Alex Mercer'}
                  </p>
                  <span className="mt-2 block text-[11px] font-medium text-slate-500">
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. UPLOAD TAB */}
      {tab === 'upload' && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleImageUpload}
            />
            {uploadedImage ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage}
                  alt="Uploaded signature preview"
                  className="max-h-24 max-w-full object-contain mx-auto border border-slate-200 p-2 rounded bg-white shadow-sm"
                />
                <p className="text-xs text-brand-600 font-semibold">Click to change image</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-900">Upload signature file</p>
                <p className="text-xs text-slate-500 mt-1">PNG with transparent background recommended</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          Signature will be embedded without server transmission.
        </span>
        <button
          type="button"
          onClick={handleApplySignature}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
        >
          <Check className="h-4 w-4" />
          <span>Save & Use Signature</span>
        </button>
      </div>
    </div>
  );
}
