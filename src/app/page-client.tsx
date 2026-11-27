'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { TOOLS, TOOL_CATEGORIES } from '@/lib/tools';
import { ToolCard } from '@/components/ToolCard';
import Image from 'next/image';
import heroPhoto from '@/assets/hero-office.jpg';
import { DemoVideo } from '@/components/landing/DemoVideo';
import { EXTRA_TOOLS } from '@/lib/extra-tools';
import { FolderOpen, Lock, Minimize2, Monitor, Search, ShieldCheck, Upload, Zap, Download, Video } from 'lucide-react';

const POPULAR = ['compress-pdf', 'merge-pdf', 'pdf-to-word', 'sign-pdf'];

/** Colour dot for each category filter, matching the tool card tints. */
const CATEGORY_DOT: Record<string, string> = {
  organize: 'bg-[#6C61EE]',
  optimize: 'bg-[#2CC59A]',
  'convert-to': 'bg-[#FFC83D]',
  'convert-from': 'bg-[#FF8A65]',
  edit: 'bg-[#A78BFA]',
  security: 'bg-[#5B7BFF]',
  other: 'bg-[#38BDF8]',
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);
  const catalogRef = useRef<HTMLElement>(null);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesSearch =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.keywords.some((kw) => kw.toLowerCase().includes(q));
      const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const matchingExtras = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return EXTRA_TOOLS;
    return EXTRA_TOOLS.filter((t) => `${t.label} ${t.description} ${t.keywords}`.toLowerCase().includes(q));
  }, [searchQuery]);

  // Support links like /?q=compress (used by Google's sitelinks search box).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      setSearchQuery(q);
      setShowAll(true);
      requestAnimationFrame(() => catalogRef.current?.scrollIntoView({ block: 'start' }));
    }
  }, []);

  const collapsed = !showAll && !searchQuery.trim() && selectedCategory === 'all';
  const visibleTools = collapsed ? filteredTools.slice(0, 8) : filteredTools;

  const popularTools = POPULAR.map((slug) => TOOLS.find((t) => t.slug === slug)).filter(Boolean) as typeof TOOLS;

  const goToCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCategory('all');
    setShowAll(true);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink pb-12 pt-14 text-white sm:pt-20 lg:min-h-[700px]">
        <Image
          src={heroPhoto}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover object-[70%_center] lg:object-center"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(27,26,58,.9)_0%,rgba(27,26,58,.8)_55%,rgba(27,26,58,.94)_100%)] lg:bg-[linear-gradient(90deg,rgba(27,26,58,.96)_0%,rgba(27,26,58,.86)_38%,rgba(75,63,228,.38)_70%,rgba(75,63,228,.14)_100%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex max-w-[640px] animate-pk-rise flex-col gap-6">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-[#7CF0C9] backdrop-blur">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Your files are processed on your device
            </span>
            <h1 className="text-[44px] font-extrabold leading-[1.03] text-white sm:text-6xl lg:text-[68px]">
              Every PDF job, done right in your browser.
            </h1>
            <p className="max-w-[540px] text-lg leading-relaxed text-[#DCDAFF] sm:text-[19px]">
              Merge, compress, sign, convert and read scanned pages with {TOOLS.length} free tools. Nothing to install and nothing uploaded.
            </p>
            <form
              role="search"
              onSubmit={goToCatalog}
              className="pk-light-field flex max-w-[540px] items-center gap-2.5 rounded-full bg-white py-1.5 pl-5 pr-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)]"
            >
              <Search className="h-5 w-5 flex-none text-[#6E6C8E]" aria-hidden="true" />
              <label htmlFor="home-tool-search" className="sr-only">Find a tool</label>
              <input
                id="home-tool-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you need to do? Try “compress”"
                className="min-h-[44px] min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-[#6E6C8E] focus:outline-none"
              />
              <button type="submit" className="min-h-[44px] rounded-full bg-brand-600 px-5 text-[15px] font-bold text-white transition hover:bg-brand-700">
                Find tool
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-semibold text-[#DCDAFF]">Popular:</span>
              {popularTools.map((t) => (
                <Link key={t.slug} href={`/tools/${t.slug}`} className="rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">
                  {t.title}
                </Link>
              ))}
              {[
                { href: '/video-compressor', label: 'Video Compressor' },
                { href: '/qr-code-generator', label: 'QR Code' },
              ].map((t) => (
                <Link key={t.href} href={t.href} className="rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Live-looking compress card (decorative) */}
        <div
          className="pk-card absolute bottom-[180px] right-[6%] hidden w-[340px] items-center gap-3.5 rounded-2xl border border-white/30 bg-white/15 p-4 text-white shadow-[0_24px_50px_-22px_rgba(0,0,0,.6)] backdrop-blur-md lg:flex"
          style={{ animationDelay: '.6s, 1.4s' }}
          aria-hidden="true"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-sun text-ink">
            <Minimize2 className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex justify-between text-sm font-bold">
              <span>annual-report.pdf</span>
              <span className="text-sun">−73%</span>
            </span>
            <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white/25">
              <span className="pk-loop block h-full rounded-full bg-sun" />
            </span>
            <span className="mt-1.5 block text-[13px] text-[#DCDAFF]">Shrinking images, text kept sharp</span>
          </span>
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:mt-32 lg:px-8">
          <div className="grid gap-5 rounded-3xl border border-white/15 bg-white/10 px-6 py-6 backdrop-blur-md sm:grid-cols-3 sm:px-8">
            {[
              { icon: Monitor, title: 'Works in your browser', text: 'Chrome, Edge, Safari and Firefox' },
              { icon: Lock, title: 'Files stay on your device', text: 'PDF tools run locally, nothing is uploaded' },
              { icon: Zap, title: `${TOOLS.length} tools, free to use`, text: 'No watermark on your files' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3.5">
                <Icon className="h-7 w-7 flex-none text-sun" strokeWidth={2} aria-hidden="true" />
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-[#DCDAFF]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DemoVideo />

      {/* Tools catalog */}
      <section ref={catalogRef} id="tools-catalog" className="scroll-mt-24 bg-[#FFFBF0] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <h2 className="text-4xl font-extrabold text-ink sm:text-[46px]">Pick a tool and drop your file</h2>
              <p className="text-lg text-ink-soft">
                {searchQuery ? `${filteredTools.length + matchingExtras.length} tools match “${searchQuery}”.` : 'Grouped by what you want to do.'}
              </p>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label="Tool categories">
                {[{ id: 'all', name: `All tools (${TOOLS.length})` }, ...TOOL_CATEGORIES.map((c) => ({ id: c.id, name: c.name.replace(' PDF', '') }))].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`pk-cat inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 text-sm font-bold transition ${
                      selectedCategory === cat.id
                        ? 'border-ink bg-ink text-white'
                        : 'border-[#ECEBF8] bg-white text-ink-soft hover:border-brand-600 hover:text-ink'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_DOT[cat.id] ?? 'bg-sun'}`} aria-hidden="true" />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              {visibleTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : null}
          {filteredTools.length > 0 && collapsed ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="min-h-[48px] rounded-full border-[1.5px] border-[#D9D7F2] px-7 font-bold text-ink transition hover:border-brand-600 hover:text-brand-600"
              >
                Show all {TOOLS.length} tools
              </button>
            </div>
          ) : null}
          {matchingExtras.length > 0 && (
            <div id="video-image-tools" className="mt-14 scroll-mt-24">
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <h3 className="text-2xl font-extrabold text-ink sm:text-3xl">Video, image &amp; QR tools</h3>
                <p className="text-ink-soft">Free, no sign-up, and your files stay on your device.</p>
              </div>
              <ul className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
                {matchingExtras.map(({ href, label, description, icon: Icon, group }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex h-full items-start gap-4 rounded-3xl border-[1.5px] border-[#ECEBF8] bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-600 hover:shadow-lg"
                    >
                      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">{group}</span>
                        <span className="block text-lg font-bold text-ink group-hover:text-brand-600">{label}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {filteredTools.length === 0 && matchingExtras.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-[#DCD9FF] p-12 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-brand-400" aria-hidden="true" />
              <p className="mt-4 text-lg font-bold text-ink">No tool matches “{searchQuery}”</p>
              <p className="mt-1 text-ink-muted">Try a word like merge, sign, split or compress.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setShowAll(true);
                }}
                className="mt-5 min-h-[44px] rounded-full bg-brand-600 px-5 font-bold text-white hover:bg-brand-700"
              >
                Show all tools
              </button>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="pk-steps relative overflow-hidden bg-brand-600 py-20 text-white sm:py-24">
        <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#6C61EE]" aria-hidden="true" />
        <span className="absolute -bottom-28 right-10 h-64 w-64 rounded-full bg-sun/90" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-4xl font-extrabold text-white sm:text-[46px]">Three steps, no upload</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            <li className="flex flex-col gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sun font-display text-xl font-extrabold">1</span>
              <h3 className="text-2xl font-bold text-white">Drop your PDF</h3>
              <p className="leading-relaxed text-[#DCDAFF]">Drag a file onto the page or pick it from your computer or phone.</p>
              <div className="flex h-[150px] items-center justify-center rounded-2xl border-2 border-dashed border-white/50 bg-white/10">
                <Upload className="h-11 w-11 text-white" strokeWidth={1.8} aria-hidden="true" />
              </div>
            </li>
            <li className="flex flex-col gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sun font-display text-xl font-extrabold">2</span>
              <h3 className="text-2xl font-bold text-white">Your browser does the work</h3>
              <p className="leading-relaxed text-[#DCDAFF]">The file is processed on your device, so it stays private and fast.</p>
              <div className="flex h-[150px] flex-col justify-center gap-2.5 rounded-2xl bg-white p-5 text-ink shadow-lift" aria-hidden="true">
                <span className="text-sm font-bold">Shrinking images 12 of 18</span>
                <span className="block h-2.5 overflow-hidden rounded-full bg-[#ECEBF7]">
                  <span className="pk-sheen block h-full w-2/3 rounded-full bg-gradient-to-r from-teal-500 to-brand-600" />
                </span>
                <span className="text-[13px] text-ink-muted">About 4 seconds left</span>
              </div>
            </li>
            <li className="flex flex-col gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sun font-display text-xl font-extrabold">3</span>
              <h3 className="text-2xl font-bold text-white">Download the result</h3>
              <p className="leading-relaxed text-[#DCDAFF]">Save it, or keep going with another tool on the same file.</p>
              <div className="flex h-[150px] items-center gap-4 rounded-2xl bg-white p-5 text-ink shadow-lift" aria-hidden="true">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500">
                  <Download className="h-7 w-7 text-white" strokeWidth={2.6} />
                </span>
                <span>
                  <span className="block font-bold">annual-report.pdf</span>
                  <span className="block text-[13px] text-ink-muted">4.8 MB, ready</span>
                </span>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Feature spotlight */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="relative flex min-h-[440px] flex-col gap-5 overflow-hidden rounded-[28px] bg-brand-600 p-8 text-white sm:p-10 sm:pb-48">
            <h2 className="max-w-[420px] text-3xl font-extrabold sm:text-[38px] sm:leading-tight">Sign contracts and send NDAs without printing</h2>
            <p className="max-w-[440px] text-[17px] leading-relaxed text-[#DCDAFF]">
              Create a mutual NDA, place signature fields and share a signing link. Every step is recorded in an audit trail.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/nda-generator" className="inline-flex min-h-[48px] items-center rounded-full bg-sun px-6 font-bold text-ink transition hover:bg-sun-300">
                Create an NDA
              </Link>
              <Link href="/tools/sign-pdf" className="inline-flex min-h-[48px] items-center rounded-full border-[1.5px] border-white/40 px-6 font-bold text-white transition hover:bg-white/10">
                Sign a PDF
              </Link>
            </div>
            <div className="absolute -bottom-8 -right-8 hidden w-[320px] -rotate-[4deg] rounded-2xl bg-white p-5 shadow-lift sm:block" aria-hidden="true">
              <span className="mb-2.5 block h-2.5 w-3/5 rounded-md bg-[#ECEBF7]" />
              <span className="mb-2.5 block h-2.5 w-[85%] rounded-md bg-[#ECEBF7]" />
              <span className="mb-2.5 block h-2.5 w-3/4 rounded-md bg-[#ECEBF7]" />
              <span className="mt-3.5 flex items-center justify-between rounded-[10px] border-2 border-dashed border-brand-600 p-2.5">
                <svg width="120" height="34" viewBox="0 0 200 54" fill="none"><path d="M6 40c14-22 22-30 26-24s-10 26-2 26 18-30 26-30-4 26 6 26 14-22 22-22 2 18 12 18 16-14 26-14" stroke="#1B1A3A" strokeWidth="3" strokeLinecap="round" /></svg>
                <span className="text-[13px] font-bold text-brand-600">Sign here</span>
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[440px] flex-col gap-5 overflow-hidden rounded-[28px] bg-sun p-8 sm:p-10 sm:pb-48">
            <h2 className="max-w-[420px] text-3xl font-extrabold text-ink sm:text-[38px] sm:leading-tight">Ask questions about any PDF</h2>
            <p className="max-w-[440px] text-[17px] leading-relaxed text-[#4A3F12]">
              The AI assistant summarizes long documents, finds dates and amounts, and explains clauses in plain words.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/ai" className="inline-flex min-h-[48px] items-center rounded-full bg-ink px-6 font-bold text-white transition hover:bg-brand-900">
                Try the AI assistant
              </Link>
              <Link href="/video-compressor" className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-ink/30 px-6 font-bold text-ink transition hover:bg-white/40">
                <Video className="h-4 w-4" aria-hidden="true" /> Compress a video
              </Link>
            </div>
            <div className="absolute -bottom-6 -right-5 hidden w-[340px] flex-col gap-2.5 rounded-2xl bg-white p-5 shadow-lift sm:flex" aria-hidden="true">
              <span className="self-end rounded-[14px_14px_4px_14px] bg-brand-100 px-3 py-2.5 text-sm font-semibold">When does this lease end?</span>
              <span className="rounded-[14px_14px_14px_4px] bg-mist px-3 py-2.5 text-sm leading-normal">On 31 March 2027. Notice is due 60 days before, see page 4.</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-ink px-8 py-14 sm:px-12 sm:py-16">
            <span className="absolute -right-20 -top-20 h-[280px] w-[280px] rounded-full bg-sun" aria-hidden="true" />
            <span className="absolute -bottom-16 right-36 h-[140px] w-[140px] rounded-full bg-brand-600" aria-hidden="true" />
            <div className="relative">
              <h2 className="max-w-[620px] text-4xl font-extrabold text-white sm:text-[44px] sm:leading-tight">Your next PDF is ten seconds away.</h2>
              <p className="mt-3 text-lg text-[#C9C7EA]">Free, private and ready in your browser.</p>
            </div>
            <a
              href="#tools-catalog"
              className="relative inline-flex min-h-[56px] items-center rounded-full bg-white px-8 text-[17px] font-bold text-ink transition hover:bg-sun"
            >
              Choose a tool
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
