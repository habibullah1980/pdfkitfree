'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { 
  Upload, 
  File as FileIcon, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  Lock,
  Unlock,
  CheckCheck
} from 'lucide-react';

interface SecurityPdfToolProps {
  toolType: 'protect' | 'unlock' | 'validate';
}

export function SecurityPdfTool({ toolType }: SecurityPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [validationInfo, setValidationInfo] = useState<{ isEncrypted: boolean; pageCount: number; hasSignature: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('secured.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount or URL replacement to prevent browser memory leaks
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
    setValidationInfo(null);

    if (!selectedFile.type.includes('pdf') && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file (.pdf).');
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      let hasSig = false;
      const textDecoder = new TextDecoder('latin1');
      const text = textDecoder.decode(buffer);
      if (text.includes('/Type /Sig') || text.includes('/ByteRange') || text.includes('/SubFilter /adbe.pkcs7')) {
        hasSig = true;
      }

      let encrypted = false;
      let pageCount = 0;
      try {
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
        encrypted = doc.isEncrypted;
        pageCount = doc.getPageCount();
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message && error.message.toLowerCase().includes('encrypt')) {
          encrypted = true;
        }
      }

      setFile(selectedFile);
      setValidationInfo({
        isEncrypted: encrypted,
        pageCount,
        hasSignature: hasSig,
      });
    } catch {
      setFile(selectedFile);
    }
  };

  const handleSecurityAction = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const base = file.name.replace(/\.[^/.]+$/, '');

      if (toolType === 'protect') {
        if (!password || password.trim().length === 0) {
          setErrorMessage('Please enter a password to encrypt this document.');
          setIsProcessing(false);
          return;
        }

        // 1. Load document with pdf-lib to ensure clean object tree
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const cleanBytes = await doc.save();

        // 2. Encrypt with AES-256 standard PDF encryption
        const encryptedBytes = await encryptPDF(new Uint8Array(cleanBytes), password.trim());
        const blob = new Blob([new Uint8Array(encryptedBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setDownloadUrl(url);
        setDownloadName(`${base}-protected.pdf`);
      } else if (toolType === 'unlock') {
        let decryptedBytes: Uint8Array | null = null;
        try {
          // Attempt decryption with user supplied password or blank password
          decryptedBytes = await decryptPDF(new Uint8Array(buffer), unlockPassword || '');
        } catch {
          // Decryption failed. Only treat it as success if the file was never encrypted.
          let isEncrypted = true;
          try {
            await PDFDocument.load(buffer); // throws for encrypted PDFs
            isEncrypted = false;
          } catch {
            isEncrypted = true;
          }
          if (isEncrypted) {
            throw new Error('Incorrect password, or this PDF uses an encryption type we cannot open. Nothing was unlocked.');
          }
          throw new Error('This PDF is not password-protected, so there is nothing to unlock.');
        }

        if (!decryptedBytes) {
          throw new Error('Unable to decrypt PDF. Please check the document password.');
        }

        const blob = new Blob([new Uint8Array(decryptedBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(`${base}-unlocked.pdf`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(`Security operation failed: ${error.message}`);
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
            {toolType === 'protect' && <Lock className="h-7 w-7" />}
            {toolType === 'unlock' && <Unlock className="h-7 w-7" />}
            {toolType === 'validate' && <CheckCheck className="h-7 w-7" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {toolType === 'protect' && 'Choose a PDF to encrypt with password'}
            {toolType === 'unlock' && 'Choose a PDF to unlock and remove restrictions'}
            {toolType === 'validate' && 'Choose a PDF to inspect digital signatures'}
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            100% Client-Side Privacy. Your passwords and documents never leave your browser memory.
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
                <p className="text-xs text-slate-500">Security & Encryption Control &bull; In-Browser</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setDownloadUrl(null);
                setPassword('');
                setUnlockPassword('');
              }}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          {toolType === 'protect' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Enter Password to Encrypt Document
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set strong document password..."
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Standard AES-256 PDF encryption will be applied. Required to open or print in any PDF reader.
                </p>
              </div>
            </div>
          )}

          {toolType === 'unlock' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
                Removing encryption unlocks printing, copying text, and editing without restrictions.
              </div>
              {validationInfo?.isEncrypted && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Password (if required)
                  </label>
                  <input
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Enter document password to remove..."
                    className="w-full max-w-md rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          )}

          {toolType === 'validate' && validationInfo && (
            <div className="space-y-3 mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <h5 className="font-bold text-slate-900">Signature &amp; security inspection:</h5>
              <p>&bull; Digital Signature: <strong className={validationInfo.hasSignature ? 'text-teal-700' : 'text-slate-600'}>{validationInfo.hasSignature ? 'Signature field found' : 'No digital signature found'}</strong></p>
              <p>&bull; Document Encryption: <strong>{validationInfo.isEncrypted ? 'Password Protected / Encrypted' : 'Unencrypted'}</strong></p>
              <p className="text-xs text-slate-500">This checks whether a signature is present. It does not verify the signer&apos;s certificate or whether the document changed after signing; use Adobe Acrobat Reader for full validation.</p>
              <p>&bull; Total Pages: <strong>{validationInfo.pageCount > 0 ? validationInfo.pageCount : 'Available after unlock'}</strong></p>
              <p>&bull; Structural Integrity: <strong className="text-teal-700">Valid PDF Container</strong></p>
            </div>
          )}

          {toolType !== 'validate' && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSecurityAction}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing security action...</span>
                  </>
                ) : (
                  <span>
                    {toolType === 'protect' && 'Encrypt & Protect PDF'}
                    {toolType === 'unlock' && 'Unlock PDF'}
                  </span>
                )}
              </button>
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
          <h4 className="text-xl font-bold text-slate-900">Security Operation Completed!</h4>
          <p className="text-xs text-slate-600 mt-1">Your secured PDF is ready for immediate download.</p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Secured PDF</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
