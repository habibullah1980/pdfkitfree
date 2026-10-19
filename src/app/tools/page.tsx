import { Metadata } from 'next';
import { TOOLS, TOOL_CATEGORIES } from '@/lib/tools';
import { ToolCard } from '@/components/ToolCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: { absolute: 'Free Online PDF Tools & Utilities | PDFKitFree' },
  description:
    'Browse our comprehensive suite of client-side PDF utilities. Merge, split, rotate, convert, protect, and sign documents securely in your browser.',
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: 'Free Online PDF Tools & Utilities | PDFKitFree',
    description: 'Explore the fast, private suite of PDF tools and digital document workflows.',
    url: 'https://www.pdfkitfree.online/tools',
    type: 'website',
  },
};

export default function ToolsDirectoryPage() {
  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'PDF Tools' }]} />

        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            PDF Tools & Document Utilities
          </h1>
          <p className="mt-3 text-base text-slate-600">
            A comprehensive catalog of browser-powered tools designed to manage, secure, convert, and sign PDF files with complete client-side data privacy.
          </p>
        </div>

        <div className="space-y-16">
          {TOOL_CATEGORIES.map((category) => {
            const categoryTools = TOOLS.filter((t) => t.category === category.id);
            if (categoryTools.length === 0) return null;

            return (
              <section key={category.id} className="scroll-mt-16" id={category.id}>
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {category.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
