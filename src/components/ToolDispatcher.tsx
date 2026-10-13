'use client';

import React from 'react';
import { ToolDefinition } from '@/lib/tools';
import { MergePdfTool } from '@/components/MergePdfTool';
import { SplitPdfTool } from '@/components/tools/SplitPdfTool';
import { RotatePdfTool } from '@/components/tools/RotatePdfTool';
import { OrganizePdfTool } from '@/components/tools/OrganizePdfTool';
import { AddPageNumbersTool } from '@/components/tools/AddPageNumbersTool';
import { OptimizePdfTool } from '@/components/tools/OptimizePdfTool';
import { ConvertToPdfTool } from '@/components/tools/ConvertToPdfTool';
import { ConvertFromPdfTool } from '@/components/tools/ConvertFromPdfTool';
import { EditPdfTool } from '@/components/tools/EditPdfTool';
import { SecurityPdfTool } from '@/components/tools/SecurityPdfTool';
import { OtherPdfTool } from '@/components/tools/OtherPdfTool';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface ToolDispatcherProps {
  tool: ToolDefinition;
}

export function ToolDispatcher({ tool }: ToolDispatcherProps) {
  switch (tool.slug) {
    // Organize
    case 'merge-pdf':
      return <MergePdfTool />;
    case 'split-pdf':
      return <SplitPdfTool />;
    case 'rotate-pdf':
      return <RotatePdfTool />;
    case 'remove-pages':
      return <OrganizePdfTool mode="remove" />;
    case 'extract-pages':
      return <OrganizePdfTool mode="extract" />;
    case 'organize-pdf':
      return <OrganizePdfTool mode="organize" />;
    case 'add-page-numbers':
      return <AddPageNumbersTool />;

    // Optimize
    case 'compress-pdf':
      return <OptimizePdfTool toolType="compress" />;
    case 'repair-pdf':
      return <OptimizePdfTool toolType="repair" />;
    case 'optimize-web-pdf':
      return <OptimizePdfTool toolType="web" />;

    // Convert to PDF
    case 'jpg-to-pdf':
    case 'png-to-pdf':
      return <ConvertToPdfTool sourceType="image" />;
    case 'word-to-pdf':
      return <ConvertToPdfTool sourceType="word" />;
    case 'excel-to-pdf':
      return <ConvertToPdfTool sourceType="excel" />;
    case 'powerpoint-to-pdf':
      return <ConvertToPdfTool sourceType="powerpoint" />;
    case 'html-to-pdf':
      return <ConvertToPdfTool sourceType="html" />;

    // Convert from PDF
    case 'pdf-to-jpg':
    case 'pdf-to-png':
      return <ConvertFromPdfTool targetFormat="image" />;
    case 'pdf-to-word':
      return <ConvertFromPdfTool targetFormat="word" />;
    case 'pdf-to-excel':
      return <ConvertFromPdfTool targetFormat="excel" />;
    case 'pdf-to-powerpoint':
      return <ConvertFromPdfTool targetFormat="powerpoint" />;
    case 'pdf-to-pdfa':
      return <ConvertFromPdfTool targetFormat="pdfa" />;

    // Edit PDF
    case 'add-text-pdf':
      return <EditPdfTool toolType="add-text" />;
    case 'add-image-pdf':
      return <EditPdfTool toolType="add-image" />;
    case 'annotate-pdf':
      return <EditPdfTool toolType="annotate" />;
    case 'add-watermark':
      return <EditPdfTool toolType="watermark" />;
    case 'crop-pdf':
      return <EditPdfTool toolType="crop" />;
    case 'flatten-pdf':
      return <EditPdfTool toolType="flatten" />;

    // Security
    case 'protect-pdf':
      return <SecurityPdfTool toolType="protect" />;
    case 'unlock-pdf':
      return <SecurityPdfTool toolType="unlock" />;
    case 'redact-pdf':
      return <SecurityPdfTool toolType="redact" />;
    case 'validate-signature':
      return <SecurityPdfTool toolType="validate" />;

    // Other
    case 'extract-text':
      return <OtherPdfTool toolType="extract-text" />;
    case 'extract-images':
      return <OtherPdfTool toolType="extract-images" />;
    case 'compare-pdf':
      return <OtherPdfTool toolType="compare" />;
    case 'fill-pdf-form':
      return <OtherPdfTool toolType="fill-form" />;
    case 'ocr-pdf':
      return <OtherPdfTool toolType="ocr" />;

    // Signing
    case 'sign-pdf':
      return (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900">Sign PDF & Digital Agreements</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Upload any PDF agreement, preview pages, draw or type signatures, and place them with client-side verification.
          </p>
          <div className="mt-6">
            <Link
              href="/nda-generator"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-teal-700 transition"
            >
              <span>Launch Full Document Signer</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      );

    default:
      return <MergePdfTool />;
  }
}
