import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TOOLS, getToolBySlug } from '@/lib/tools';
import { getToolSeoData } from '@/lib/tool-content';
import { getBlogPostBySlug } from '@/lib/blog-data';
import { ShareTool } from '@/components/ShareTool';
import { SIZE_TARGETS, IMAGE_SIZE_TARGETS } from '@/lib/size-targets';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ToolDispatcher } from '@/components/ToolDispatcher';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { getToolIconConfig } from '@/lib/tool-icons';

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
    title: { absolute: tool.metaTitle },
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

  const toolIcon = getToolIconConfig(tool.id || tool.slug);
  const ToolIcon = toolIcon.icon;

  return (
    <div className="pk-tool-hero min-h-screen bg-[radial-gradient(800px_420px_at_92%_0%,#FFE7A8_0%,rgba(255,231,168,0)_62%),radial-gradient(600px_400px_at_0%_0%,#FFD9CC_0%,rgba(255,217,204,0)_60%),linear-gradient(#E6E4FF,#F3F2FF_420px,#fff_760px)] py-10">
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
        <div className="mb-8 mt-2 flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[20px] bg-white shadow-lift">
            <ToolIcon className={`h-8 w-8 ${toolIcon.colorClass}`} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">{tool.title}</h1>
            <p className="mt-2 max-w-3xl text-base text-ink-soft sm:text-lg">{tool.longDescription}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-teal-800 shadow-sm">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Runs in your browser
              </p>
              <ShareTool title={tool.title} path={`/tools/${tool.slug}`} />
            </div>
            {tool.slug === 'compress-pdf' && (
              <nav aria-label="Compress to a size" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-ink-muted">Need an exact size?</span>
                {SIZE_TARGETS.filter((t) => ['50kb', '100kb', '200kb', '500kb', '1mb'].includes(t.slug)).map((t) => (
                  <Link key={t.slug} href={`/compress-pdf-to/${t.slug}`} className="rounded-full bg-white px-3 py-1.5 font-bold text-brand-600 shadow-sm hover:bg-brand-50">
                    Under {t.label}
                  </Link>
                ))}
              </nav>
            )}
            {['jpg-to-pdf', 'png-to-pdf'].includes(tool.slug) && (
              <nav aria-label="Compress an image" className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-ink-muted">Just need a smaller image?</span>
                {IMAGE_SIZE_TARGETS.filter((t) => ['20kb', '50kb', '100kb', '200kb'].includes(t.slug)).map((t) => (
                  <Link key={t.slug} href={`/compress-image-to/${t.slug}`} className="rounded-full bg-white px-3 py-1.5 font-bold text-brand-600 shadow-sm hover:bg-brand-50">
                    Image under {t.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Functional Tool Workspace */}
        <div className="mb-16">
          <ToolDispatcher tool={tool} />
        </div>
        <FeedbackButton toolName={tool.title} />

        {/* SEO Explanations, Instructions, Use Cases & FAQs */}
        <div className="space-y-14">
          {/* Detailed Intro */}
          <div className="rounded-3xl bg-[#FFF1CC] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink mb-3">
              About {tool.title} by PDFKitFree
            </h2>
            <p className="text-sm sm:text-base text-ink-soft leading-relaxed">
              {seoData.introParagraph}
            </p>
          </div>

          {/* How-To Steps */}
          <div>
            <h2 className="text-2xl font-bold text-ink mb-6">
              How to Use {tool.title} Step-by-Step
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {seoData.howToSteps.map((step, idx) => (
                <div key={idx} className="rounded-[20px] border-[1.5px] border-[#EEEDF8] bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun font-display text-base font-extrabold text-ink mb-3">
                    {idx + 1}
                  </span>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-World Use Cases */}
          {seoData.useCases && seoData.useCases.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-ink mb-6">
                Common Practical Use Cases
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {seoData.useCases.map((uc, idx) => (
                  <div key={idx} className="rounded-[20px] border-[1.5px] border-[#EEEDF8] bg-white p-6">
                    <h3 className="font-semibold text-ink text-base mb-2">{uc.title}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed">{uc.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Asked Questions */}
          {seoData.faqs && seoData.faqs.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-ink mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {seoData.faqs.map((faq, idx) => (
                  <div key={idx} className="rounded-[20px] border-[1.5px] border-[#EEEDF8] bg-white p-6">
                    <h3 className="text-base font-semibold text-ink">{faq.question}</h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Tools & Relevant Blog Articles */}
          <div className="rounded-3xl border-[1.5px] border-[#EEEDF8] bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink mb-4">Related PDF Tools & Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedTools.map((relTool) => (
                <Link
                  key={relTool.slug}
                  href={`/tools/${relTool.slug}`}
                  className="group flex flex-col justify-between rounded-[18px] border-[1.5px] border-[#EEEDF8] p-4 transition hover:-translate-y-0.5 hover:border-brand-600"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-ink group-hover:text-brand-600 transition">
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
                  <p className="text-sm font-semibold text-ink mt-0.5">
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
