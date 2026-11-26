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

/** "Compress video to N MB" pages. Use cases avoid naming exact limits of apps that change them often. */
export const VIDEO_SIZE_TARGETS: SizeTarget[] = [
  { slug: '5mb', label: '5 MB', bytes: 5 * MB, useCase: 'website forms and support tickets with small upload limits' },
  { slug: '8mb', label: '8 MB', bytes: 8 * MB, useCase: 'chat apps and older Discord upload limits' },
  { slug: '10mb', label: '10 MB', bytes: 10 * MB, useCase: 'Discord, Slack and chat apps with a 10 MB cap' },
  { slug: '16mb', label: '16 MB', bytes: 16 * MB, useCase: 'messaging apps and phones with limited data' },
  { slug: '20mb', label: '20 MB', bytes: 20 * MB, useCase: 'email services with a 20 MB attachment limit' },
  { slug: '25mb', label: '25 MB', bytes: 25 * MB, useCase: 'Gmail and other email attachments' },
  { slug: '50mb', label: '50 MB', bytes: 50 * MB, useCase: 'course portals, job applications and cloud forms' },
  { slug: '100mb', label: '100 MB', bytes: 100 * MB, useCase: 'large uploads, portfolios and shared drives' },
];

/** "Compress image to N KB" pages. */
export const IMAGE_SIZE_TARGETS: SizeTarget[] = [
  { slug: '10kb', label: '10 KB', bytes: 10 * KB, useCase: 'signature images on online application forms' },
  { slug: '20kb', label: '20 KB', bytes: 20 * KB, useCase: 'passport photos and signatures on application portals' },
  { slug: '30kb', label: '30 KB', bytes: 30 * KB, useCase: 'exam and visa application photo uploads' },
  { slug: '50kb', label: '50 KB', bytes: 50 * KB, useCase: 'ID photos and profile pictures on job sites' },
  { slug: '100kb', label: '100 KB', bytes: 100 * KB, useCase: 'online forms, profile photos and email signatures' },
  { slug: '200kb', label: '200 KB', bytes: 200 * KB, useCase: 'product photos and fast-loading web pages' },
  { slug: '500kb', label: '500 KB', bytes: 500 * KB, useCase: 'blog images and marketplace listings' },
  { slug: '1mb', label: '1 MB', bytes: 1 * MB, useCase: 'sharing phone photos by email or chat' },
];

export function findTarget(list: SizeTarget[], slug: string): SizeTarget | undefined {
  return list.find((t) => t.slug === slug);
}
