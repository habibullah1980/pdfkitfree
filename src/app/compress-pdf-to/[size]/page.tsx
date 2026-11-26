import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { OptimizePdfTool } from '@/components/tools/OptimizePdfTool';
import { ShareTool } from '@/components/ShareTool';
import { SIZE_TARGETS, getSizeTarget } from '@/lib/size-targets';
import { SITE_CONFIG } from '@/lib/site-config';
import { ShieldCheck } from 'lucide-react';

interface Props {
  params: { size: string };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return SIZE_TARGETS.map((t) => ({ size: t.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const t = getSizeTarget(params.size);
  if (!t) return { title: 'Not found' };
  const title = `Compress PDF to ${t.label} Online Free | PDFKitFree`;
  const description = `Reduce a PDF to under ${t.label} for ${t.useCase}. Free, no sign-up, and your file never leaves your device.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/compress-pdf-to/${t.slug}` },
    openGraph: { title, description, url: `${SITE_CONFIG.url}/compress-pdf-to/${t.slug}`, type: 'website' },
  };
}

export default function CompressToSizePage({ params }: Props) {
  const t = getSizeTarget(params.size);
  if (!t) notFound();

  const faqs = [
    {
      q: `Can every PDF be compressed to ${t.label}?`,
      a: `Most scanned and photo-heavy PDFs can. A PDF that is mostly text or has many pages may not get under ${t.label}; if that happens we show you the smallest size we reached instead of pretending.`,
    },
    {
      q: 'Is my file uploaded anywhere?',
      a: 'No. Compression runs in your browser on your own device, so the PDF is never sent to a server.',
    },
    {
      q: 'Will the text get blurry?',
      a: 'No. Text, links and fonts are kept as they are. Only photos and scanned images are resized and re-encoded, starting with gentle settings.',
    },
    {
      q: `What if my file is already under ${t.label}?`,
      a: 'We tell you straight away and leave the file unchanged, so you can upload it as it is.',
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `Compress PDF to ${t.label} - PDFKitFree`,
    url: `${SITE_CONFIG.url}/compress-pdf-to/${t.slug}`,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All modern web browsers',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <div className="pk-tool-hero min-h-screen bg-[radial-gradient(800px_420px_at_92%_0%,#FFE7A8_0%,rgba(255,231,168,0)_62%),radial-gradient(600px_400px_at_0%_0%,#FFD9CC_0%,rgba(255,217,204,0)_60%),linear-gradient(#E6E4FF,#F3F2FF_420px,#fff_760px)] py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'PDF Tools', href: '/tools' },
            { label: 'Compress PDF', href: '/tools/compress-pdf' },
            { label: `To ${t.label}`, href: `/compress-pdf-to/${t.slug}` },
          ]}
        />
        <header className="mb-8 mt-2">
          <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">Compress PDF to {t.label}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">
            Need a PDF under {t.label} for {t.useCase}? Drop it below. We shrink the images step by step until the file fits, and keep the text sharp.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-teal-800 shadow-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Runs in your browser
            </span>
            <ShareTool title={`Compress PDF to ${t.label}`} path={`/compress-pdf-to/${t.slug}`} />
          </div>
        </header>

        <div className="mb-16">
          <OptimizePdfTool toolType="compress" targetBytes={t.bytes} targetLabel={t.label} />
        </div>

        <section className="mb-14">
          <h2 className="text-2xl font-extrabold text-ink">How to compress a PDF to {t.label}</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ['Add your PDF', 'Drag it onto the box above or tap to pick it from your phone or computer.'],
              ['Press Compress', `We try gentle settings first and get stronger only until it is under ${t.label}.`],
              ['Download', 'Save the smaller PDF. If it could not reach the target, you see the smallest size we got.'],
            ].map(([h, p], i) => (
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
          <h2 className="text-2xl font-extrabold text-ink">Other sizes</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {SIZE_TARGETS.filter((o) => o.slug !== t.slug).map((o) => (
              <Link
                key={o.slug}
                href={`/compress-pdf-to/${o.slug}`}
                className="rounded-full border-[1.5px] border-[#ECEBF8] bg-white px-4 py-2 text-sm font-bold text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
              >
                Compress PDF to {o.label}
              </Link>
            ))}
            <Link href="/tools/compress-pdf" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
              Choose your own level
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
