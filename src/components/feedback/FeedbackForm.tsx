'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Send, Star, X } from 'lucide-react';
import { CATEGORY_LABELS, FEEDBACK_LIMITS } from '@/lib/feedback-validation';

type Category = keyof typeof CATEGORY_LABELS;
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface Props {
  /** The page the feedback is about. Defaults to the current page. */
  pageUrl?: string;
  /** Short name of the tool, shown to the user ("About: Merge PDF"). */
  toolName?: string;
  /** Called after a successful submit (the modal uses it to move focus). */
  onDone?: () => void;
  autoFocus?: boolean;
}

export function FeedbackForm({ pageUrl, toolName, onDone, autoFocus }: Props) {
  const ids = useId();
  const [category, setCategory] = useState<Category | ''>('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [shot, setShot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const startedAt = useRef(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!shot) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(shot);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [shot]);

  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const pickFile = (f: File | null) => {
    setErrors((e) => ({ ...e, screenshot: '' }));
    if (!f) return setShot(null);
    if (!(FEEDBACK_LIMITS.screenshotTypes as readonly string[]).includes(f.type)) {
      setErrors((e) => ({ ...e, screenshot: 'Please choose a PNG, JPG or WebP image.' }));
      return;
    }
    if (f.size > FEEDBACK_LIMITS.screenshotMaxBytes) {
      setErrors((e) => ({ ...e, screenshot: 'That image is larger than 2 MB. Please choose a smaller one.' }));
      return;
    }
    setShot(f);
  };

  const check = () => {
    const e: Record<string, string> = {};
    if (!category) e.category = 'Please choose a category.';
    if (!rating) e.rating = 'Please give a rating from 1 to 5 stars.';
    const len = message.trim().length;
    if (len < FEEDBACK_LIMITS.messageMin) e.message = `Please write at least ${FEEDBACK_LIMITS.messageMin} characters.`;
    else if (len > FEEDBACK_LIMITS.messageMax) e.message = `Please keep it under ${FEEDBACK_LIMITS.messageMax} characters.`;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) e.email = 'Please enter a valid email address, or leave it empty.';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    const e = check();
    setErrors(e);
    const firstBad = Object.keys(e).find((k) => e[k]);
    if (firstBad) {
      document.getElementById(`${ids}-${firstBad}`)?.focus();
      return;
    }
    setSending(true);
    try {
      const form = new FormData();
      form.set('category', category);
      form.set('rating', String(rating));
      form.set('message', message);
      form.set('email', email.trim());
      form.set('pageUrl', pageUrl || window.location.pathname);
      form.set('website', website);
      form.set('startedAt', String(startedAt.current));
      if (shot) form.set('screenshot', shot, shot.name);
      const res = await fetch('/api/feedback', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.error });
          document.getElementById(`${ids}-${data.field}`)?.focus();
        } else setServerError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
      onDone?.();
    } catch {
      setServerError('You seem to be offline. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setCategory('');
    setRating(0);
    setMessage('');
    setEmail('');
    setShot(null);
    setErrors({});
    setSent(false);
    startedAt.current = Date.now();
  };

  if (sent) {
    return (
      <div className="py-8 text-center" role="status">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h3 ref={successRef} tabIndex={-1} className="text-xl font-bold text-ink outline-none">
          Thank you for your feedback!
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          We read every message. {email.trim() ? 'If we need more details, we will reply to the email you gave.' : 'It helps us decide what to fix and build next.'}
        </p>
        <button type="button" onClick={reset} className="mt-6 text-sm font-semibold text-brand-600 hover:underline">
          Send more feedback
        </button>
      </div>
    );
  }

  const count = message.trim().length;
  const shown = hover || rating;
  const fieldErr = (k: string) =>
    errors[k] ? (
      <p id={`${ids}-${k}-err`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {errors[k]}
      </p>
    ) : null;
  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60';

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {toolName && (
        <p className="rounded-xl bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700">
          About: {toolName}
        </p>
      )}
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Hidden from people; bots that fill every field are ignored */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">What is it about?</legend>
        <div
          id={`${ids}-category`}
          tabIndex={-1}
          role="radiogroup"
          aria-describedby={errors.category ? `${ids}-category-err` : undefined}
          className="grid grid-cols-2 gap-2 outline-none"
        >
          {CATEGORIES.map((c, i) => (
            <button
              key={c}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => {
                setCategory(c);
                setErrors((e) => ({ ...e, category: '' }));
              }}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                category === c ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-ink-soft hover:border-brand-300'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {fieldErr('category')}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">How would you rate your experience?</legend>
        <div
          id={`${ids}-rating`}
          tabIndex={-1}
          role="radiogroup"
          aria-describedby={errors.rating ? `${ids}-rating-err` : undefined}
          className="flex items-center gap-1 outline-none"
          onMouseLeave={() => setHover(0)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setRating((r) => Math.min(5, r + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setRating((r) => Math.max(1, r - 1));
            }
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}, ${RATING_WORDS[n]}`}
              tabIndex={rating ? (rating === n ? 0 : -1) : n === 1 ? 0 : -1}
              onMouseEnter={() => setHover(n)}
              onClick={() => {
                setRating(n);
                setErrors((e) => ({ ...e, rating: '' }));
              }}
              className="rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Star className={`h-8 w-8 transition ${n <= shown ? 'fill-sun text-sun' : 'text-slate-300'}`} aria-hidden="true" />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink-muted" aria-live="polite">
            {shown ? RATING_WORDS[shown] : ''}
          </span>
        </div>
        {fieldErr('rating')}
      </fieldset>

      <div>
        <label htmlFor={`${ids}-message`} className="mb-2 block text-sm font-bold text-ink">
          Your feedback
        </label>
        <textarea
          id={`${ids}-message`}
          rows={5}
          value={message}
          maxLength={FEEDBACK_LIMITS.messageMax + 200}
          disabled={sending}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={`${ids}-message-count${errors.message ? ` ${ids}-message-err` : ''}`}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message) setErrors((x) => ({ ...x, message: '' }));
          }}
          placeholder={category === 'bug' ? 'What happened, and what did you expect? Which browser and device?' : 'Tell us what works, what does not, or what you would like us to add.'}
          className={inputCls}
        />
        <div className="mt-1 flex justify-between gap-2">
          {fieldErr('message') || <span />}
          <span id={`${ids}-message-count`} className={`text-xs ${count > FEEDBACK_LIMITS.messageMax ? 'text-rose-600' : 'text-ink-muted'}`}>
            {count}/{FEEDBACK_LIMITS.messageMax}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor={`${ids}-email`} className="mb-2 block text-sm font-bold text-ink">
          Email <span className="font-normal text-ink-muted">(optional, only if you would like a reply)</span>
        </label>
        <input
          id={`${ids}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          disabled={sending}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${ids}-email-err` : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((x) => ({ ...x, email: '' }));
          }}
          placeholder="you@example.com"
          className={inputCls}
        />
        {fieldErr('email')}
      </div>

      <div>
        <span className="mb-2 block text-sm font-bold text-ink">
          Screenshot <span className="font-normal text-ink-muted">(optional, PNG, JPG or WebP up to 2 MB)</span>
        </span>
        {preview && shot ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your screenshot" className="h-14 w-20 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{shot.name}</span>
            <button
              type="button"
              onClick={() => {
                setShot(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
              className="rounded-lg p-2 text-ink-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Remove screenshot"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label
            htmlFor={`${ids}-screenshot`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-semibold text-ink-soft transition hover:border-brand-400 hover:text-brand-700 focus-within:ring-2 focus-within:ring-brand-500"
          >
            <ImagePlus className="h-5 w-5" aria-hidden="true" /> Add a screenshot
            <input
              ref={fileInput}
              id={`${ids}-screenshot`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-describedby={errors.screenshot ? `${ids}-screenshot-err` : undefined}
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
          </label>
        )}
        {fieldErr('screenshot')}
        <p className="mt-1.5 text-xs text-ink-muted">Please do not include private documents or personal details in screenshots.</p>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-70"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        {sending ? 'Sending...' : 'Send feedback'}
      </button>
      <p className="text-center text-xs text-ink-muted">
        We store your message, rating and the page address (without any file names or links in it). Your files are never sent.
      </p>
    </form>
  );
}
