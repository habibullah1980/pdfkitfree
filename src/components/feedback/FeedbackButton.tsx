'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquareHeart, X } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

/** Floating "Feedback" button with an accessible dialog, used on tool pages. */
export function FeedbackButton({ toolName }: { toolName?: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab' && dialogRef.current) {
        // keep keyboard focus inside the dialog
        const items = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input:not([tabindex="-1"]), textarea, select, [tabindex="0"]')
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="fixed bottom-4 left-4 z-40 print:hidden inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-bold text-white shadow-lg ring-2 ring-white/70 transition hover:-translate-y-0.5 hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sun sm:bottom-6 sm:left-6"
      >
        <MessageSquareHeart className="h-5 w-5 text-sun" aria-hidden="true" />
        <span>Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-dialog-title" className="text-xl font-bold text-ink">
                  Share your feedback
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Found a bug or have an idea? Tell us. It takes a minute.</p>
              </div>
              <button type="button" onClick={close} className="rounded-full p-2 text-ink-muted hover:bg-slate-100 hover:text-ink" aria-label="Close feedback form">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <FeedbackForm toolName={toolName} autoFocus />
          </div>
        </div>
      )}
    </>
  );
}
