import { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { VideoCompressorTool } from '@/components/VideoCompressorTool';
import { 
  ShieldCheck, 
  Cpu, 
  Lock, 
  Zap, 
  HelpCircle, 
  ArrowRight, 
  FileCheck, 
  CheckCircle2 
} from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'Video Compressor Online - Reduce Video Size | PDFKitFree' },
  description:
    'Compress video files (MP4, MOV, WebM, AVI, MKV) directly in your browser without uploading to external servers. Reduce file size up to 80% with presets for Discord, email, and web.',
  alternates: {
    canonical: '/video-compressor',
  },
  openGraph: {
    title: 'Video Compressor Online - Reduce Video Size | PDFKitFree',
    description:
      'Fast, private client-side video compressor. Shrink video size with zero cloud uploads or privacy leaks.',
    url: 'https://www.pdfkitfree.online/video-compressor',
    type: 'website',
  },
};

export default function VideoCompressorPage() {
  const faqs = [
    {
      q: 'How does client-side video compression work without uploading?',
      a: 'pdfkitfree uses your web browser’s built-in hardware acceleration and modern Media APIs to transcode and downscale video frames locally in memory. Your raw video footage never leaves your device or touches any cloud server.',
    },
    {
      q: 'Which video formats and codecs are supported?',
      a: 'We support standard video containers including MP4, WebM, MOV, and MKV encoded with common codecs such as H.264 (AVC), VP8, VP9, and AV1. Browser compatibility may vary depending on your operating system and graphics hardware.',
    },
    {
      q: 'What compression preset should I choose?',
      a: 'Choose "Small File" for email attachments, Discord (8MB limit), Slack, or WhatsApp. Choose "Balanced" for web embedding or general sharing where you need a great mix of clarity and size reduction. Choose "High Quality" if you are preserving presentation slides or crisp text.',
    },
    {
      q: 'Is there a video file size limit?',
      a: 'Because video processing occurs entirely within browser memory (RAM), files up to 800 MB compress smoothly on most modern computers. For extremely large multi-gigabyte 4K recordings, browser RAM constraints can occasionally trigger memory alerts.',
    },
    {
      q: 'Will my video lose audio during compression?',
      a: 'No. pdfkitfree taps into your browser’s Web Audio API to preserve audio tracks and sync them with the compressed visual frames in the output container.',
    },
  ];

  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Video Compressor' }]} />

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center pt-2 pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-4 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Zero-Upload Privacy: In-Browser Video Compression</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Compress Videos <span className="text-brand-600">Fast & Privately</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Shrink MP4, MOV, and WebM video files without third-party cloud uploads. Reduce file size up to 80% for email, messaging, and web publishing.
          </p>
        </div>

        {/* Interactive Video Compressor Component */}
        <div className="mb-16">
          <VideoCompressorTool />
        </div>

        {/* Value Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12 border-t border-b border-slate-200 my-12">
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Zero Server Uploads</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Confidential internal recordings, family clips, and company presentations remain strictly confidential inside your computer’s RAM.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Queue or Waiting Line</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cloud compressors make you wait in queues or throttle speeds for free users. Local execution utilizes your GPU and multi-core CPU directly.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Adaptive Presets & Scaling</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Choose from Small File, Balanced, and High Quality, or scale down from 4K/1080p to 720p or 480p to hit exact size thresholds.
            </p>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <section className="py-12">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              How to Compress Videos Online for Free
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Three simple steps to optimize your video files without installing heavy desktop software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                1
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Select Your Video</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Drag and drop your MP4, MOV, or WebM clip into the upload box. Review original resolution, duration, and file size.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                2
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Choose Compression Settings</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Pick a preset (Small File, Balanced, or High Quality) and adjust target resolution (such as 720p HD or 480p SD).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
                3
              </span>
              <h4 className="font-bold text-slate-900 text-sm">Process & Download</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Click &quot;Compress Video Now&quot;. Once processing completes, inspect the preview and download your reduced video file.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="py-12 border-t border-slate-100 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 mb-2">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Video Compressor Q&amp;A
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                  <span>{faq.q}</span>
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 pl-6 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Free Tools Cross-Links */}
        <section className="my-12 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/70 to-teal-50/70 p-8 sm:p-10">
          <div className="max-w-3xl">
            <span className="inline-block rounded-md bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800 mb-3">
              Explore More Free Utilities
            </span>
            <h3 className="text-2xl font-bold text-slate-900">
              Need to compress or sign PDF documents too?
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              pdfkitfree provides a comprehensive browser-first toolkit for PDFs, contracts, and digital workflows with zero signup required for standard PDF tools.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/tools/compress-pdf"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <span>Compress PDF</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tools/merge-pdf"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>Merge PDFs</span>
              </Link>
              <Link
                href="/nda-esign"
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-semibold text-teal-900 hover:bg-teal-100"
              >
                <FileCheck className="h-3.5 w-3.5 text-teal-700" />
                <span>NDA &amp; eSign Hub</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
