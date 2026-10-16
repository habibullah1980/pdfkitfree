import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TOOLS, getToolBySlug } from '@/lib/tools';
import { getToolSeoData } from '@/lib/tool-content';
import { getBlogPostBySlug } from '@/lib/blog-data';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ToolDispatcher } from '@/components/ToolDispatcher';
import { ShieldCheck, ArrowRight } from 'lucide-react';

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

  const pageTitle = tool.metaTitle.includes('PDFKitFree')
    ? { absolute: tool.metaTitle }
    : tool.metaTitle;

  return {
    title: pageTitle,
    description: tool.metaDescription,
    keywords: tool.keywords,
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: tool.metaTitle,
      description: tool.metaDescription,
      type: 'website',
      url: `https://www.pdfkitfree.online/tools/${tool.slug}`,
    },
  };
}

export default function IndividualToolPage({ params }: ToolPageProps) {
  const tool = getToolBySlug(params.slug);

  if (!tool) {
    notFound();
  }

  const seoData = getToolSeoData(tool.slug);
  const relatedTools = seoData.relatedToolSlugs
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter((t): t is typeof tool => Boolean(t))
    .slice(0, 4);
  const relatedBlog = seoData.relatedBlogSlug ? getBlogPostBySlug(seoData.relatedBlogSlug) : undefined;

  // Schema.org WebApplication structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${tool.title} - PDFKitFree`,
    description: tool.shortDescription,
    url: `https://www.pdfkitfree.online/tools/${tool.slug}`,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All modern web browsers',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  // Schema.org FAQPage structured data
  const faqJsonLd = seoData.faqs && seoData.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seoData.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  } : null;

  return (
    <div className="py-10 bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

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

        {/* SEO Explanations, Instructions, Use Cases & FAQs */}
        <div className="border-t border-slate-200 pt-12 space-y-12">
          {/* Detailed Intro */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              About {tool.title} by PDFKitFree
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              {seoData.introParagraph}
            </p>
          </div>

          {/* How-To Steps */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              How to Use {tool.title} Step-by-Step
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {seoData.howToSteps.map((step, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 mb-3">
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-World Use Cases */}
          {seoData.useCases && seoData.useCases.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Common Practical Use Cases
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {seoData.useCases.map((uc, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-900 text-base mb-2">{uc.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{uc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Asked Questions */}
          {seoData.faqs && seoData.faqs.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {seoData.faqs.map((faq, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Tools & Relevant Blog Articles */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Related PDF Tools & Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedTools.map((relTool) => (
                <Link
                  key={relTool.slug}
                  href={`/tools/${relTool.slug}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:shadow-sm transition"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 group-hover:text-brand-600 transition">
                      {relTool.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {relTool.shortDescription}
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                    <span>Use Tool</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            {relatedBlog && (
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                    Recommended Reading
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {relatedBlog.title}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">{relatedBlog.excerpt}</p>
                </div>
                <Link
                  href={`/blog/${relatedBlog.slug}`}
                  className="rounded-lg bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-brand-50 hover:text-brand-700 transition flex-shrink-0"
                >
                  Read Article &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
