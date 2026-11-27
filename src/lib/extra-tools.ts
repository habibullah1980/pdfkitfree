import { Film, ImageIcon, Maximize2, Minimize2, Music, QrCode, Video, type LucideIcon } from 'lucide-react';

export interface ExtraTool {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  group: 'Video' | 'Image' | 'QR';
  keywords: string;
}

/** Free tools outside the 38 PDF tools, shown in the header menu and on the home page. */
export const EXTRA_TOOLS: ExtraTool[] = [
  { label: 'Video Compressor', href: '/video-compressor', description: 'Shrink MP4, MOV and WebM for email, WhatsApp or Discord.', icon: Video, group: 'Video', keywords: 'video compress mp4 mov smaller' },
  { label: 'Video to MP3', href: '/video-to-mp3', description: 'Save the sound from any video as an MP3.', icon: Music, group: 'Video', keywords: 'video mp3 audio extract sound mp4' },
  { label: 'Video to GIF', href: '/video-to-gif', description: 'Turn a short clip into a looping GIF.', icon: Film, group: 'Video', keywords: 'video gif animation clip' },
  { label: 'QR Code Generator', href: '/qr-code-generator', description: 'QR codes for links, Wi-Fi, text and phone numbers.', icon: QrCode, group: 'QR', keywords: 'qr code generator wifi link barcode' },
  { label: 'HEIC to JPG', href: '/heic-to-jpg', description: 'Convert iPhone photos to JPG, many at once.', icon: ImageIcon, group: 'Image', keywords: 'heic jpg iphone photo convert heif png' },
  { label: 'Resize Image', href: '/resize-image', description: 'Exact pixels, percent, or Instagram and passport sizes.', icon: Maximize2, group: 'Image', keywords: 'resize image photo pixels instagram passport' },
  { label: 'Compress Image', href: '/compress-image-to/100kb', description: 'Get a photo under 20 KB, 50 KB, 100 KB and more.', icon: Minimize2, group: 'Image', keywords: 'compress image photo kb smaller jpg' },
];
