import { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-data';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog & Document Security Insights - pdfkitfree',
  description:
    'Articles and best practices on PDF security, digital signatures, legal frameworks (ESIGN, eIDAS), and browser-based document productivity.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'pdfkitfree Blog - Document Security & PDF Guides',
    description: 'Learn how to handle, convert, and sign confidential documents privately.',
  },
};

export default function BlogDirectoryPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Blog' }]} />

        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Document Insights & Security Blog
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Guides, technical breakdowns, and legal insights on electronic signatures, client-side encryption, and PDF manipulation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-brand-200"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-brand-600 mb-3">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-normal">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readTime}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 hover:text-brand-600 transition">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>

                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {post.date}
                </span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700"
                >
                  <span>Read Article</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
