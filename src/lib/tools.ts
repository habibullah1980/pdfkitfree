export interface ToolDefinition {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: 'organize' | 'convert' | 'security' | 'sign-edit';
  badge?: string;
  isImplemented: boolean;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

export interface ToolCategory {
  id: 'organize' | 'convert' | 'security' | 'sign-edit';
  name: string;
  description: string;
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'organize',
    name: 'Organize & Manage',
    description: 'Merge, split, remove, rotate, and reorder PDF pages instantly in your browser.',
  },
  {
    id: 'convert',
    name: 'Convert PDF',
    description: 'Convert PDFs to standard formats and convert office files or images to PDF.',
  },
  {
    id: 'security',
    name: 'Security & Privacy',
    description: 'Password protect, unlock, flatten, and sanitize confidential PDF documents.',
  },
  {
    id: 'sign-edit',
    name: 'Sign & Contract',
    description: 'Electronic signatures, NDAs, and secure client-side document processing.',
  },
];

export const TOOLS: ToolDefinition[] = [
  {
    id: 'merge-pdf',
    slug: 'merge-pdf',
    title: 'Merge PDF',
    shortDescription: 'Combine multiple PDF files into a single organized document in seconds.',
    longDescription: 'Select and combine two or more PDF files into one clean document. Reorder, preview files, and download your consolidated PDF instantly without file upload to external servers.',
    category: 'organize',
    badge: 'Popular',
    isImplemented: true,
    metaTitle: 'Merge PDF Files Online - Free & Private | FreePDFKit',
    metaDescription: 'Merge PDF files online for free. Combine multiple PDFs into one document directly in your browser. 100% private, no cloud storage needed.',
    keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'free pdf combiner', 'merge documents'],
  },
  {
    id: 'split-pdf',
    slug: 'split-pdf',
    title: 'Split PDF',
    shortDescription: 'Extract specific pages or split larger documents into separate PDF files.',
    longDescription: 'Separate single pages or custom page ranges from your PDF document with full client-side privacy.',
    category: 'organize',
    isImplemented: false,
    metaTitle: 'Split PDF Online - Extract Pages | FreePDFKit',
    metaDescription: 'Extract pages from PDF or split documents into multiple files securely and free of charge.',
    keywords: ['split pdf', 'extract pdf pages', 'separate pdf pages'],
  },
  {
    id: 'rotate-pdf',
    slug: 'rotate-pdf',
    title: 'Rotate PDF',
    shortDescription: 'Rotate individual pages or entire documents 90, 180, or 270 degrees.',
    longDescription: 'Fix incorrectly oriented scanned documents and align pages effortlessly.',
    category: 'organize',
    isImplemented: false,
    metaTitle: 'Rotate PDF Pages Online | FreePDFKit',
    metaDescription: 'Rotate PDF pages permanently in your browser. Simple, secure, and completely free.',
    keywords: ['rotate pdf', 'turn pdf pages', 'fix pdf orientation'],
  },
  {
    id: 'pdf-to-jpg',
    slug: 'pdf-to-jpg',
    title: 'PDF to JPG',
    shortDescription: 'Convert high-resolution PDF pages into crisp JPG and PNG image files.',
    longDescription: 'Export your PDF sheets into high-quality images ready for sharing and embedding.',
    category: 'convert',
    isImplemented: false,
    metaTitle: 'Convert PDF to JPG Online | FreePDFKit',
    metaDescription: 'High-quality PDF to JPG image conversion. Fast, secure, and free online tool.',
    keywords: ['pdf to jpg', 'pdf to image', 'convert pdf to photos'],
  },
  {
    id: 'protect-pdf',
    slug: 'protect-pdf',
    title: 'Protect PDF',
    shortDescription: 'Encrypt your document with AES encryption and strong custom passwords.',
    longDescription: 'Add user and owner passwords with robust permissions to protect sensitive files.',
    category: 'security',
    badge: 'Security',
    isImplemented: false,
    metaTitle: 'Protect PDF with Password Online | FreePDFKit',
    metaDescription: 'Password protect your sensitive PDF files with secure client-side encryption.',
    keywords: ['protect pdf', 'encrypt pdf', 'password protect document'],
  },
  {
    id: 'sign-pdf',
    slug: 'sign-pdf',
    title: 'Online PDF Signer',
    shortDescription: 'Draw, type, or upload legal electronic signatures and place them on your PDFs.',
    longDescription: 'Sign contracts, consent forms, and NDAs quickly directly in your browser with tamper-evident workflows.',
    category: 'sign-edit',
    badge: 'Essential',
    isImplemented: false,
    metaTitle: 'Sign PDF Online - Free Electronic Signatures | FreePDFKit',
    metaDescription: 'Free online electronic signature tool for contracts and documents. Fast, secure, and legally binding signature workflows.',
    keywords: ['sign pdf online', 'electronic signature', 'esign pdf free', 'sign documents online'],
  },
];

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
