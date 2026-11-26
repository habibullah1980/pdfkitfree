import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShareTool } from '@/components/ShareTool';
import { SITE_CONFIG } from '@/lib/site-config';

export interface SizeLandingProps {
  /** e.g. "Compress Video to 25 MB" */
  heading: string;
  intro: string;
  path: string;
  privacyNote: string;
  breadcrumbs: { label: string; href?: string }[];
  steps: [string, string][];
  faqs: { q: string; a: string }[];
  others: { href: string; label: string }[];
  ownLevel?: { href: string; label: string };
  /** Heading above the `others` links. */
  othersTitle?: string;
  children: React.ReactNode;
}

/** Shared layout for the "compress X to N size" landing pages. */
export function SizeLanding(props: SizeLandingProps) {
  const { heading, intro, path, privacyNote, breadcrumbs, steps, faqs, others, ownLevel, othersTitle = 'Other sizes', children } = props;
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${heading} - PDFKitFree`,
    url: `${SITE_CONFIG.url}${path}`,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All modern web browsers',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <div className="pk-tool-hero min-h-screen bg-[radial-gradient(800px_420px_at_92%_0%,#FFE7A8_0%,rgba(255,231,168,0)_62%),radial-gradient(600px_400px_at_0%_0%,#FFD9CC_0%,rgba(255,217,204,0)_60%),linear-gradient(#E6E4FF,#F3F2FF_420px,#fff_760px)] py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
        <header className="mb-8 mt-2">
          <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">{heading}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">{intro}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-teal-800 shadow-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {privacyNote}
            </span>
            <ShareTool title={heading} path={path} />
          </div>
        </header>

        <div className="mb-16">{children}</div>

        <section className="mb-14">
          <h2 className="text-2xl font-extrabold text-ink">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {steps.map(([h, p], i) => (
              <li key={h} className="rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sun font-display font-extrabold text-ink">{i + 1}</span>
                <h3 className="mt-3 text-lg font-bold text-ink">{h}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-14">
          <h2 className="text-2xl font-extrabold text-ink">Questions</h2>
          <div className="mt-5 divide-y divide-slate-100 rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group p-6">
                <summary className="cursor-pointer list-none text-lg font-bold text-ink">{f.q}</summary>
                <p className="mt-2 leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-extrabold text-ink">{othersTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {others.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="rounded-full border-[1.5px] border-[#ECEBF8] bg-white px-4 py-2 text-sm font-bold text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
              >
                {o.label}
              </Link>
            ))}
            {ownLevel && (
              <Link href={ownLevel.href} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
                {ownLevel.label}
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
