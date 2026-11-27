/** Feedback form rules, shared by the form (instant hints) and the API (the real check). */

export const FEEDBACK_LIMITS = {
  messageMin: 10,
  messageMax: 3000,
  emailMax: 254,
  screenshotMaxBytes: 2 * 1024 * 1024,
  screenshotTypes: ['image/png', 'image/jpeg', 'image/webp'] as const,
  /** Submissions faster than this after opening the form are treated as bots. */
  minFillMs: 2500,
};

export const CATEGORY_LABELS: Record<'bug' | 'feature' | 'general' | 'ux', string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  general: 'General feedback',
  ux: 'User experience',
};

export const STATUS_LABELS: Record<'new' | 'reviewing' | 'planned' | 'completed' | 'declined', string> = {
  new: 'New',
  reviewing: 'Reviewing',
  planned: 'Planned',
  completed: 'Completed',
  declined: 'Declined',
};

export interface FeedbackInput {
  category: unknown;
  rating: unknown;
  message: unknown;
  email?: unknown;
  pageUrl?: unknown;
  website?: unknown; // honeypot
  startedAt?: unknown;
}

export interface CleanFeedback {
  category: 'bug' | 'feature' | 'general' | 'ux';
  rating: number;
  message: string;
  email: string | null;
  pagePath: string | null;
  toolSlug: string | null;
}

/** Removes control characters and invisible formatting, normalises line breaks and trims. */
export function cleanText(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** Keeps only the path of a page on this site (never a full external URL or query string). */
export function cleanPagePath(raw: unknown): { pagePath: string | null; toolSlug: string | null } {
  if (typeof raw !== 'string' || !raw) return { pagePath: null, toolSlug: null };
  let path: string;
  try {
    // Only the path is kept: no domain, query string or fragment (they can hold personal data)
    // Repeated slashes are collapsed so a path can never become a link to another site ("//evil.com")
    path = new URL(raw, 'https://www.pdfkitfree.online').pathname.replace(/\/{2,}/g, '/');
  } catch {
    return { pagePath: null, toolSlug: null };
  }
  if (!/^\/[A-Za-z0-9/_\-.]*$/.test(path) || path.length > 300) return { pagePath: null, toolSlug: null };
  const m = path.match(/^\/tools\/([a-z0-9-]{1,80})\/?$/) || path.match(/^\/((?:compress-(?:pdf|image|video)-to)\/[a-z0-9-]{1,40}|[a-z0-9-]{3,40})\/?$/);
  const toolSlug = m ? m[1] : null;
  return { pagePath: path, toolSlug };
}

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

export type ValidationResult = { ok: true; value: CleanFeedback } | { ok: false; error: string; field?: string; spam?: boolean };

export function validateFeedback(input: FeedbackInput, now = Date.now()): ValidationResult {
  // Spam traps first: a filled hidden field or an instant submit means a bot. They get a fake success.
  if (typeof input.website === 'string' && input.website.trim()) return { ok: false, error: 'spam', spam: true };
  const started = Number(input.startedAt);
  if (Number.isFinite(started) && started > 0 && now - started < FEEDBACK_LIMITS.minFillMs) return { ok: false, error: 'spam', spam: true };

  const category = String(input.category || '');
  if (!['bug', 'feature', 'general', 'ux'].includes(category)) return { ok: false, field: 'category', error: 'Please choose a category.' };

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, field: 'rating', error: 'Please give a rating from 1 to 5 stars.' };

  if (typeof input.message !== 'string') return { ok: false, field: 'message', error: 'Please write your feedback.' };
  const message = cleanText(input.message);
  if (message.length < FEEDBACK_LIMITS.messageMin) return { ok: false, field: 'message', error: `Please write at least ${FEEDBACK_LIMITS.messageMin} characters.` };
  if (message.length > FEEDBACK_LIMITS.messageMax) return { ok: false, field: 'message', error: `Please keep it under ${FEEDBACK_LIMITS.messageMax} characters.` };
  const links = message.match(URL_RE) || [];
  if (links.length > 3) return { ok: false, field: 'message', error: 'Please include no more than 3 links.' };
  if (/(.)\1{29,}/.test(message)) return { ok: false, field: 'message', error: 'Your message looks like it contains repeated characters. Please write it in your own words.' };

  let email: string | null = null;
  if (input.email != null && String(input.email).trim()) {
    email = cleanText(String(input.email)).toLowerCase();
    if (email.length > FEEDBACK_LIMITS.emailMax || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(email)) {
      return { ok: false, field: 'email', error: 'Please enter a valid email address, or leave it empty.' };
    }
  }

  return { ok: true, value: { category: category as CleanFeedback['category'], rating, message, email, ...cleanPagePath(input.pageUrl) } };
}

/** Checks the file's real format from its first bytes (not from its name or the browser's claim). */
export function sniffImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && String.fromCharCode(...Array.from(bytes.slice(0, 4))) === 'RIFF' && String.fromCharCode(...Array.from(bytes.slice(8, 12))) === 'WEBP') return 'image/webp';
  return null;
}
