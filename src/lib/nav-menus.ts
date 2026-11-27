import {
  BadgeCheck,
  Combine,
  FileArchive,
  FileImage,
  FileLock2,
  FilePen,
  FileSignature,
  FileText,
  FolderClock,
  Hash,
  ImageIcon,
  LayoutGrid,
  Minimize2,
  PenLine,
  RotateCw,
  ScanText,
  Scissors,
  ShieldOff,
  SquareStack,
  Stamp,
  EyeOff,
  GitCompare,
  ClipboardList,
  FileOutput,
  type LucideIcon,
} from 'lucide-react';
import { EXTRA_TOOLS } from '@/lib/extra-tools';

export interface NavMenuItem {
  label: string;
  href: string;
  description?: string;
  icon: LucideIcon;
}

export interface NavMenuGroup {
  title: string;
  items: NavMenuItem[];
}

export interface NavMenu {
  id: string;
  label: string;
  /** The top-level nav link this menu replaces; used for the active state. */
  activePrefixes: string[];
  groups: NavMenuGroup[];
  footer?: { label: string; href: string };
  /** Desktop panel width in px. */
  width: number;
  /** Where the desktop panel lines up with its button. */
  align: 'start' | 'center';
}

const t = (slug: string, label: string, icon: LucideIcon): NavMenuItem => ({ label, href: `/tools/${slug}`, icon });

export const PDF_MENU: NavMenu = {
  id: 'pdf',
  label: 'PDF Tools',
  activePrefixes: ['/tools', '/compress-pdf-to'],
  width: 820,
  align: 'start',
  groups: [
    {
      title: 'Organize',
      items: [
        t('merge-pdf', 'Merge PDF', Combine),
        t('split-pdf', 'Split PDF', Scissors),
        t('remove-pages', 'Remove pages', SquareStack),
        t('organize-pdf', 'Organize pages', LayoutGrid),
        t('rotate-pdf', 'Rotate PDF', RotateCw),
      ],
    },
    {
      title: 'Compress & convert',
      items: [
        t('compress-pdf', 'Compress PDF', Minimize2),
        t('pdf-to-word', 'PDF to Word', FileText),
        t('word-to-pdf', 'Word to PDF', FileOutput),
        t('pdf-to-jpg', 'PDF to JPG', FileImage),
        t('jpg-to-pdf', 'JPG to PDF', ImageIcon),
      ],
    },
    {
      title: 'Edit & sign',
      items: [
        { label: 'Sign PDF', href: '/sign-pdf', icon: PenLine },
        t('add-text-pdf', 'Add text', FilePen),
        t('add-watermark', 'Add watermark', Stamp),
        t('add-page-numbers', 'Page numbers', Hash),
        t('fill-pdf-form', 'Fill PDF form', ClipboardList),
      ],
    },
    {
      title: 'Security & more',
      items: [
        t('protect-pdf', 'Protect PDF', FileLock2),
        t('unlock-pdf', 'Unlock PDF', ShieldOff),
        t('redact-pdf', 'Redact PDF', EyeOff),
        t('ocr-pdf', 'OCR (scan to text)', ScanText),
        t('compare-pdf', 'Compare PDFs', GitCompare),
      ],
    },
  ],
  footer: { label: 'See all 38 PDF tools', href: '/tools' },
};

export const MEDIA_MENU: NavMenu = {
  id: 'media',
  label: 'Video & Image',
  activePrefixes: EXTRA_TOOLS.map((x) => x.href.split('/').slice(0, 2).join('/')),
  width: 560,
  align: 'center',
  groups: [
    {
      title: '',
      items: EXTRA_TOOLS.map(({ label, href, description, icon }) => ({ label, href, description, icon })),
    },
  ],
};

export const SIGN_MENU: NavMenu = {
  id: 'sign',
  label: 'NDA & eSign',
  activePrefixes: ['/nda-esign', '/nda-generator', '/sign-pdf'],
  width: 420,
  align: 'center',
  groups: [
    {
      title: '',
      items: [
        { label: 'NDA & eSign workspace', href: '/nda-esign', description: 'Upload an NDA or contract and collect signatures.', icon: FileSignature },
        { label: 'NDA generator', href: '/nda-generator', description: 'Create a one-way or mutual NDA from a template.', icon: FileArchive },
        { label: 'Sign PDF', href: '/sign-pdf', description: 'Draw, type or upload your signature and place it.', icon: PenLine },
        { label: 'Validate signatures', href: '/tools/validate-signature', description: 'Check the digital signatures inside a PDF.', icon: BadgeCheck },
        { label: 'My agreements', href: '/nda-esign?tab=history', description: 'See documents you have sent and signed.', icon: FolderClock },
      ],
    },
  ],
};

/** Top navigation in order: dropdown menus and plain links. */
export const NAV_ITEMS: (NavMenu | { label: string; href: string })[] = [
  PDF_MENU,
  MEDIA_MENU,
  SIGN_MENU,
  { label: 'AI Assistant', href: '/ai' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
];

export const isMenu = (x: NavMenu | { label: string; href: string }): x is NavMenu => 'groups' in x;

