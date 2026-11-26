/** Landing pages for "compress PDF to N KB/MB" searches. Each opens the real compressor with a size target. */
export interface SizeTarget {
  slug: string;
  label: string;
  bytes: number;
  useCase: string;
}

const KB = 1024;
const MB = 1024 * 1024;

export const SIZE_TARGETS: SizeTarget[] = [
  { slug: '20kb', label: '20 KB', bytes: 20 * KB, useCase: 'signature scans and tiny attachments on government portals' },
  { slug: '50kb', label: '50 KB', bytes: 50 * KB, useCase: 'online application forms that only accept very small files' },
  { slug: '100kb', label: '100 KB', bytes: 100 * KB, useCase: 'job portals, exam registrations and ID document uploads' },
  { slug: '150kb', label: '150 KB', bytes: 150 * KB, useCase: 'certificates and mark sheets on admission portals' },
  { slug: '200kb', label: '200 KB', bytes: 200 * KB, useCase: 'university applications and visa document uploads' },
  { slug: '300kb', label: '300 KB', bytes: 300 * KB, useCase: 'scanned forms with a few pages' },
  { slug: '500kb', label: '500 KB', bytes: 500 * KB, useCase: 'CVs with photos, invoices and multi-page scans' },
  { slug: '1mb', label: '1 MB', bytes: 1 * MB, useCase: 'email attachments and HR systems with a 1 MB cap' },
  { slug: '2mb', label: '2 MB', bytes: 2 * MB, useCase: 'reports and brochures with many photos' },
];

export function getSizeTarget(slug: string): SizeTarget | undefined {
  return SIZE_TARGETS.find((t) => t.slug === slug);
}
