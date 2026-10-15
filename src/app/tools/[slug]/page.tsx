import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TOOLS, getToolBySlug } from '@/lib/tools';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ToolDispatcher } from '@/components/ToolDispatcher';
import { ShieldCheck, Lock } from 'lucide-react';

interface ToolPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export function generateMetadata({ params }: ToolPageProps): Metadata {
  const tool = getToolBySlug(params.slug);
  if (!tool) {
    return {
      title: 'Tool Not Found',
    };
  }

  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
    keywords: tool.keywords,
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: tool.metaTitle,
      description: tool.metaDescription,
      type: 'website',
      url: `https://pdfkitfree.com/tools/${tool.slug}`,
    },
  };
}

export default function IndividualToolPage({ params }: ToolPageProps) {
  const tool = getToolBySlug(params.slug);

  if (!tool) {
    notFound();
  }

  // Schema.org WebApplication structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    description: tool.shortDescription,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All modern web browsers',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <div className="py-10 bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'PDF Tools', href: '/tools' },
            { label: tool.title },
          ]}
        />

        {/* Tool Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-800 mb-4">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Zero Server Uploads • Secure Browser Execution</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {tool.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {tool.longDescription}
          </p>
        </div>

        {/* Functional Tool Workspace */}
        <div className="mb-16">
          <ToolDispatcher tool={tool} />
        </div>

        {/* SEO How-To & Feature Explanations */}
        <div className="border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            How to use {tool.title} on pdfkitfree
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 mb-3">
                1
              </span>
              <h3 className="font-semibold text-slate-900">Select Files</h3>
              <p className="mt-1 text-sm text-slate-600">
                Drag and drop your PDF documents into the drop area or choose files from your device.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 mb-3">
                2
              </span>
              <h3 className="font-semibold text-slate-900">Adjust & Organize</h3>
              <p className="mt-1 text-sm text-slate-600">
                Rearrange pages and documents in the exact order you need with one click.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 mb-3">
                3
              </span>
              <h3 className="font-semibold text-slate-900">Download Instantly</h3>
              <p className="mt-1 text-sm text-slate-600">
                Click download to save the processed PDF immediately to your hard drive.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 sm:p-8 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-teal-100 p-2.5 text-teal-700">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Are your PDF files safe?
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Yes, absolutely. Unlike other PDF converters that stream your files to remote cloud servers, pdfkitfree executes the file manipulation right in your browser through client-side WebAssembly and JavaScript primitives. Your sensitive data never leaves your computer or smartphone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
