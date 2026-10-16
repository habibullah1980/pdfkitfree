import {
  // Organize
  Combine,
  Scissors,
  FileX,
  FileOutput,
  LayoutGrid,
  RotateCw,
  Hash,
  // Optimize
  FileArchive,
  Wrench,
  Globe,
  // Convert to
  Image,
  Images,
  FileText,
  FileSpreadsheet,
  Presentation,
  Code2,
  // Convert from
  FileImage,
  FileCheck,
  // Edit
  Type,
  PlusCircle,
  Highlighter,
  Stamp,
  Crop,
  Layers,
  PenTool,
  // Security
  Lock,
  Unlock,
  EyeOff,
  ShieldCheck,
  // Other / Advanced
  FileSearch,
  FileStack,
  GitCompare,
  CheckSquare,
  ScanText,
  // Workflow / New Tools
  Video,
  FileSignature,
  Bot,
  MessageSquare,
  // Fallback
  File,
  LucideIcon,
} from 'lucide-react';

export interface ToolIconConfig {
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  label: string;
}

/**
 * Brand Color Mapping:
 * - Brand Purple (#4b49ac / brand-600): Core PDF Manipulation & Structure
 * - Supporting Blue (#7DA0FA / text-blue-600): Document Conversions (Word, Excel, PPT, etc.)
 * - Lavender (#7978e3 / text-indigo-600): PDF Editing, Annotations & Content Enhancement
 * - Coral (#f3797e / text-rose-500): Compression, Security, Protection & Page Removal
 * - Teal / Emerald: Verification, Validation, Web Optimization & Signatures
 */

export const TOOL_ICON_MAP: Record<string, ToolIconConfig> = {
  // --- 1. ORGANIZE PDF ---
  'merge-pdf': {
    icon: Combine,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Merge PDF icon',
  },
  'split-pdf': {
    icon: Scissors,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Split PDF icon',
  },
  'remove-pages': {
    icon: FileX,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70',
    label: 'Remove PDF Pages icon',
  },
  'extract-pages': {
    icon: FileOutput,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Extract PDF Pages icon',
  },
  'organize-pdf': {
    icon: LayoutGrid,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Organize PDF Pages icon',
  },
  'rotate-pdf': {
    icon: RotateCw,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Rotate PDF icon',
  },
  'add-page-numbers': {
    icon: Hash,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Add Page Numbers icon',
  },

  // --- 2. OPTIMIZE PDF ---
  'compress-pdf': {
    icon: FileArchive,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70',
    label: 'Compress PDF icon',
  },
  'repair-pdf': {
    icon: Wrench,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-100 group-hover:bg-amber-100/70',
    label: 'Repair PDF icon',
  },
  'optimize-web-pdf': {
    icon: Globe,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'Optimize PDF for Web icon',
  },

  // --- 3. CONVERT TO PDF ---
  'jpg-to-pdf': {
    icon: Image,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-100 group-hover:bg-blue-100/70',
    label: 'JPG to PDF icon',
  },
  'png-to-pdf': {
    icon: Images,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-100 group-hover:bg-blue-100/70',
    label: 'PNG to PDF icon',
  },
  'word-to-pdf': {
    icon: FileText,
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-100 group-hover:bg-blue-100/70',
    label: 'Word to PDF icon',
  },
  'excel-to-pdf': {
    icon: FileSpreadsheet,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100/70',
    label: 'Excel to PDF icon',
  },
  'powerpoint-to-pdf': {
    icon: Presentation,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 border-orange-100 group-hover:bg-orange-100/70',
    label: 'PowerPoint to PDF icon',
  },
  'html-to-pdf': {
    icon: Code2,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50 border-purple-100 group-hover:bg-purple-100/70',
    label: 'HTML to PDF icon',
  },

  // --- 4. CONVERT FROM PDF ---
  'pdf-to-jpg': {
    icon: FileImage,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'PDF to JPG icon',
  },
  'pdf-to-png': {
    icon: Images,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'PDF to PNG icon',
  },
  'pdf-to-word': {
    icon: FileText,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-100 group-hover:bg-blue-100/70',
    label: 'PDF to Word icon',
  },
  'pdf-to-excel': {
    icon: FileSpreadsheet,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100/70',
    label: 'PDF to Excel icon',
  },
  'pdf-to-powerpoint': {
    icon: Presentation,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 border-orange-100 group-hover:bg-orange-100/70',
    label: 'PDF to PowerPoint icon',
  },
  'pdf-to-pdfa': {
    icon: FileCheck,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'PDF to PDF/A icon',
  },

  // --- 5. EDIT PDF ---
  'add-text-pdf': {
    icon: Type,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Add Text to PDF icon',
  },
  'add-image-pdf': {
    icon: PlusCircle,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Add Image to PDF icon',
  },
  'annotate-pdf': {
    icon: Highlighter,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-100 group-hover:bg-amber-100/70',
    label: 'Draw & Annotate PDF icon',
  },
  'add-watermark': {
    icon: Stamp,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Add Watermark icon',
  },
  'crop-pdf': {
    icon: Crop,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Crop PDF Pages icon',
  },
  'flatten-pdf': {
    icon: Layers,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Flatten PDF icon',
  },
  'sign-pdf': {
    icon: PenTool,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'Sign PDF Document icon',
  },

  // --- 6. PDF SECURITY ---
  'protect-pdf': {
    icon: Lock,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70',
    label: 'Protect PDF icon',
  },
  'unlock-pdf': {
    icon: Unlock,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'Unlock PDF icon',
  },
  'redact-pdf': {
    icon: EyeOff,
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70',
    label: 'Redact PDF Content icon',
  },
  'validate-signature': {
    icon: ShieldCheck,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'Validate PDF Signatures icon',
  },

  // --- 7. OTHER PDF TOOLS ---
  'extract-text': {
    icon: FileSearch,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Extract Text icon',
  },
  'extract-images': {
    icon: FileStack,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-100 group-hover:bg-blue-100/70',
    label: 'Extract Images icon',
  },
  'compare-pdf': {
    icon: GitCompare,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'Compare Two PDFs icon',
  },
  'fill-pdf-form': {
    icon: CheckSquare,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'Fill PDF Forms icon',
  },
  'ocr-pdf': {
    icon: ScanText,
    colorClass: 'text-brand-600',
    bgClass: 'bg-brand-50 border-brand-100 group-hover:bg-brand-100/70',
    label: 'OCR Scanned PDF icon',
  },

  // --- STANDALONE WORKFLOWS & EXPANDED TOOLS ---
  'video-compressor': {
    icon: Video,
    colorClass: 'text-slate-700',
    bgClass: 'bg-slate-100 border-slate-200 group-hover:bg-slate-200/70',
    label: 'Video Compressor icon',
  },
  'nda-generator': {
    icon: FileSignature,
    colorClass: 'text-teal-700',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'NDA Generator icon',
  },
  'nda-esign': {
    icon: FileSignature,
    colorClass: 'text-teal-700',
    bgClass: 'bg-teal-50 border-teal-100 group-hover:bg-teal-100/70',
    label: 'NDA & eSign icon',
  },
  'ai': {
    icon: Bot,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'AI PDF Chat icon',
  },
  'ai-pdf-chat': {
    icon: MessageSquare,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 border-indigo-100 group-hover:bg-indigo-100/70',
    label: 'AI PDF Chat icon',
  },
};

const DEFAULT_TOOL_ICON: ToolIconConfig = {
  icon: File,
  colorClass: 'text-brand-600',
  bgClass: 'bg-slate-50 border-slate-100 group-hover:bg-brand-50 group-hover:border-brand-100',
  label: 'PDF Tool icon',
};

/**
 * Retrieves the strongly-typed icon configuration for a tool.
 * Logs a development-time warning if an unknown tool ID or slug is supplied.
 */
export function getToolIconConfig(toolIdOrSlug: string): ToolIconConfig {
  const normalizedKey = toolIdOrSlug?.toLowerCase().trim();
  const config = TOOL_ICON_MAP[normalizedKey];

  if (!config) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[PDFKitFree] No specific icon mapped for tool ID: "${toolIdOrSlug}". Falling back to default.`
      );
    }
    return DEFAULT_TOOL_ICON;
  }

  return config;
}
