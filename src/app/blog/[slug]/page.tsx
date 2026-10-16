import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS, getBlogPostBySlug } from '@/lib/blog-data';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Calendar, Clock, User, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export function generateMetadata({ params }: ArticlePageProps): Metadata {
  const post = getBlogPostBySlug(params.slug);
  if (!post) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: `${post.title} | PDFKitFree Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://www.pdfkitfree.online/blog/${post.slug}`,
    },
  };
}

export default function ArticleTemplatePage({ params }: ArticlePageProps) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  // Schema.org Article structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'pdfkitfree',
      url: 'https://pdfkitfree.com',
    },
  };

  return (
    <div className="py-12 bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: 'Blog', href: '/blog' },
            { label: post.title },
          ]}
        />

        {/* Article Header */}
        <header className="mb-10 pt-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-brand-600 mb-3">
            <span className="rounded-full bg-brand-50 px-3 py-1">
              {post.category}
            </span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center gap-1 text-slate-500 font-normal">
              <Calendar className="h-3.5 w-3.5" />
              {post.date}
            </span>
            <span className="text-slate-400">•</span>
            <span className="flex items-center gap-1 text-slate-500 font-normal">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-tight">
            {post.title}
          </h1>

          <div className="mt-6 flex items-center gap-3 border-t border-b border-slate-100 py-3 text-xs text-slate-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{post.author}</p>
              <p className="text-slate-500">Security & Document Engineering</p>
            </div>
          </div>
        </header>

        {/* Lead Excerpt */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-6 mb-10 text-base text-slate-700 leading-relaxed font-medium">
          {post.excerpt}
        </div>

        {/* Article Body */}
        <div className="space-y-6 text-base text-slate-800 leading-relaxed">
          {post.content.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        {/* Call to action inside blog */}
        <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Experience Browser-First Document Workflows
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Test our client-side Merge PDF tool right now with zero uploads, zero installation, and no fee.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/tools/merge-pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
            >
              <span>Merge PDFs For Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to all articles</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
