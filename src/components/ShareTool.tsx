'use client';

import React, { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/site-config';

/**
 * Lets visitors pass a tool on to friends or colleagues. Uses the phone's own share sheet
 * when there is one, otherwise offers WhatsApp, X, Facebook, LinkedIn and copy link.
 */
export function ShareTool({ title, path }: { title: string; path: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${SITE_CONFIG.url}${path}`;
  const text = `${title}: free, and the file never leaves your device`;

  const share = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Cancelled or blocked: fall back to the menu below.
      }
    }
    setOpen((v) => !v);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const enc = encodeURIComponent;
  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        aria-expanded={open}
        className="inline-flex min-h-[36px] items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-ink shadow-sm transition hover:text-brand-600"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" /> Share this tool
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 flex w-60 flex-col gap-1 rounded-2xl border border-[#ECEBF8] bg-white p-2 shadow-lift">
          {links.map((l) => (
            <a
              key={l.name}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
            >
              Share on {l.name}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-slate-50"
          >
            {copied ? <Check className="h-4 w-4 text-teal-600" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}
