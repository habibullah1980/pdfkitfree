/** Cross-links shown at the bottom of the standalone image and QR tool pages. */
export const IMAGE_TOOL_LINKS = [
  { href: '/qr-code-generator', label: 'QR code generator' },
  { href: '/heic-to-jpg', label: 'HEIC to JPG' },
  { href: '/heic-to-png', label: 'HEIC to PNG' },
  { href: '/resize-image', label: 'Resize image' },
  { href: '/compress-image-to/50kb', label: 'Compress image to 50 KB' },
  { href: '/tools/jpg-to-pdf', label: 'JPG to PDF' },
];

export const otherImageTools = (self: string) => IMAGE_TOOL_LINKS.filter((l) => l.href !== self);
