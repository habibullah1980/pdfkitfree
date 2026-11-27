import { Metadata } from 'next';
import Link from 'next/link';
import { Bug, Lightbulb, MessageCircle, Sparkles } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata: Metadata = {
  title: { absolute: 'Send Feedback, Report a Bug or Suggest a Feature | PDFKitFree' },
  description:
    'Tell us what works, report a bug, or suggest a new PDF tool. Your feedback decides what PDFKitFree fixes and builds next.',
  alternates: { canonical: '/feedback' },
  openGraph: {
    title: 'Send Feedback | PDFKitFree',
    description: 'Report a bug or suggest a feature for PDFKitFree.',
    url: `${SITE_CONFIG.url}/feedback`,
    type: 'website',
  },
};

const KINDS = [
  { icon: Bug, title: 'Bug reports', text: 'Something broke or gave a wrong result? Tell us which tool, what you did and which browser you use.' },
  { icon: Lightbulb, title: 'Feature requests', text: 'Missing a tool or an option? Suggest it. Popular requests go to the top of our list.' },
  { icon: Sparkles, title: 'User experience', text: 'Hard to find something, confusing step or slow page? We want to know.' },
  { icon: MessageCircle, title: 'General feedback', text: 'Anything else on your mind, good or bad.' },
];

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-amber-50 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Feedback' }]} />
        <div className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Help us make PDFKitFree better</h1>
          <p className="mt-3 text-base text-ink-soft">
            Report a bug, suggest a feature or tell us how a tool worked for you. We read every message.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:col-span-7">
            <FeedbackForm />
          </div>
          <aside className="space-y-4 md:col-span-5">
            {KINDS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-2xl bg-white/70 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink">{title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{text}</p>
                </div>
              </div>
            ))}
            <p className="px-1 text-sm text-ink-soft">
              Need a personal answer? Use the <Link href="/contact" className="font-semibold text-brand-600 hover:underline">contact page</Link>.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
