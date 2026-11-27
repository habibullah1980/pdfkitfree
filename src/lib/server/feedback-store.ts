import crypto from 'crypto';
import { executeNeonQuery, isNeonConfigured } from './neon-db';
import type { QueryFn } from './app-state-store';

/**
 * User feedback and suggestions, stored in Postgres (Neon) table `feedback`.
 * The table is created on first use. Screenshots are stored inline (base64) so no extra
 * storage service or credentials are needed; their size is capped by validation.
 */

export const FEEDBACK_CATEGORIES = ['bug', 'feature', 'general', 'ux'] as const;
export const FEEDBACK_STATUSES = ['new', 'reviewing', 'planned', 'completed', 'declined'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'ux')),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  page_path TEXT CHECK (page_path IS NULL OR char_length(page_path) <= 300),
  tool_slug TEXT CHECK (tool_slug IS NULL OR char_length(tool_slug) <= 80),
  user_agent TEXT,
  screenshot_b64 TEXT,
  screenshot_type TEXT CHECK (screenshot_type IS NULL OR screenshot_type IN ('image/png', 'image/jpeg', 'image/webp')),
  screenshot_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'completed', 'declined')),
  important BOOLEAN NOT NULL DEFAULT FALSE,
  admin_note TEXT CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000),
  ip_hash TEXT,
  message_hash TEXT
);
CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback (status);
CREATE INDEX IF NOT EXISTS feedback_ip_idx ON feedback (ip_hash, created_at DESC);`;

export interface NewFeedback {
  category: FeedbackCategory;
  rating: number;
  message: string;
  email: string | null;
  pagePath: string | null;
  toolSlug: string | null;
  userAgent: string | null;
  screenshot: { b64: string; type: string; bytes: number } | null;
  ipHash: string;
}

export interface FeedbackRow {
  id: number;
  createdAt: string;
  updatedAt: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  email: string | null;
  pagePath: string | null;
  toolSlug: string | null;
  hasScreenshot: boolean;
  screenshotBytes: number | null;
  status: FeedbackStatus;
  important: boolean;
  adminNote: string | null;
}

export interface FeedbackFilter {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  important?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FeedbackStore {
  insert(f: NewFeedback): Promise<number>;
  /** Submissions from this IP hash in the last `minutes`. */
  countRecent(ipHash: string, minutes: number): Promise<number>;
  /** True if the same message text was already sent from this IP in the last day. */
  isDuplicate(ipHash: string, message: string): Promise<boolean>;
  list(filter: FeedbackFilter): Promise<{ rows: FeedbackRow[]; total: number; counts: Record<string, number> }>;
  update(id: number, patch: { status?: FeedbackStatus; important?: boolean; adminNote?: string | null }): Promise<FeedbackRow | null>;
  screenshot(id: number): Promise<{ data: Buffer; type: string } | null>;
}

export const messageHash = (m: string) => crypto.createHash('sha256').update(m.trim().toLowerCase().replace(/\s+/g, ' ')).digest('hex');

export function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET || 'pdfkitfree-feedback';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

function toRow(r: Record<string, unknown>): FeedbackRow {
  const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
  return {
    id: Number(r.id),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    category: r.category as FeedbackCategory,
    rating: Number(r.rating),
    message: String(r.message),
    email: (r.email as string) ?? null,
    pagePath: (r.page_path as string) ?? null,
    toolSlug: (r.tool_slug as string) ?? null,
    hasScreenshot: Boolean(r.has_screenshot),
    screenshotBytes: r.screenshot_bytes == null ? null : Number(r.screenshot_bytes),
    status: r.status as FeedbackStatus,
    important: Boolean(r.important),
    adminNote: (r.admin_note as string) ?? null,
  };
}

const SELECT_COLS = `id, created_at, updated_at, category, rating, message, email, page_path, tool_slug,
  (screenshot_b64 IS NOT NULL) AS has_screenshot, screenshot_bytes, status, important, admin_note`;

export function createFeedbackStore(query: QueryFn): FeedbackStore {
  let ready: Promise<void> | null = null;
  const ensure = () => {
    if (!ready) {
      ready = (async () => {
        for (const stmt of FEEDBACK_SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) await query(stmt);
      })().catch((e) => {
        ready = null;
        throw e;
      });
    }
    return ready;
  };

  return {
    async insert(f) {
      await ensure();
      const rows = await query(
        `INSERT INTO feedback (category, rating, message, email, page_path, tool_slug, user_agent, screenshot_b64, screenshot_type, screenshot_bytes, ip_hash, message_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [f.category, f.rating, f.message, f.email, f.pagePath, f.toolSlug, f.userAgent, f.screenshot?.b64 ?? null, f.screenshot?.type ?? null, f.screenshot?.bytes ?? null, f.ipHash, messageHash(f.message)]
      );
      return Number(rows[0].id);
    },
    async countRecent(ipHash, minutes) {
      await ensure();
      const rows = await query(`SELECT COUNT(*)::int AS n FROM feedback WHERE ip_hash = $1 AND created_at > NOW() - ($2::int * INTERVAL '1 minute')`, [ipHash, minutes]);
      return Number(rows[0].n);
    },
    async isDuplicate(ipHash, message) {
      await ensure();
      const rows = await query(`SELECT 1 FROM feedback WHERE ip_hash = $1 AND message_hash = $2 AND created_at > NOW() - INTERVAL '1 day' LIMIT 1`, [ipHash, messageHash(message)]);
      return rows.length > 0;
    },
    async list(filter) {
      await ensure();
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.status) {
        params.push(filter.status);
        where.push(`status = $${params.length}`);
      }
      if (filter.category) {
        params.push(filter.category);
        where.push(`category = $${params.length}`);
      }
      if (filter.important) where.push('important = TRUE');
      if (filter.search) {
        params.push(`%${filter.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
        where.push(`(message ILIKE $${params.length} OR email ILIKE $${params.length} OR page_path ILIKE $${params.length})`);
      }
      const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
      const offset = Math.max(0, filter.offset ?? 0);
      const rows = await query(`SELECT ${SELECT_COLS} FROM feedback ${w} ORDER BY important DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
      const total = await query(`SELECT COUNT(*)::int AS n FROM feedback ${w}`, params);
      const byStatus = await query(`SELECT status, COUNT(*)::int AS n FROM feedback GROUP BY status`);
      const counts: Record<string, number> = Object.fromEntries(FEEDBACK_STATUSES.map((s) => [s, 0]));
      for (const r of byStatus) counts[String(r.status)] = Number(r.n);
      return { rows: rows.map(toRow), total: Number(total[0].n), counts };
    },
    async update(id, patch) {
      await ensure();
      const sets: string[] = [];
      const params: unknown[] = [];
      if (patch.status) {
        params.push(patch.status);
        sets.push(`status = $${params.length}`);
      }
      if (typeof patch.important === 'boolean') {
        params.push(patch.important);
        sets.push(`important = $${params.length}`);
      }
      if (patch.adminNote !== undefined) {
        params.push(patch.adminNote);
        sets.push(`admin_note = $${params.length}`);
      }
      if (!sets.length) return null;
      params.push(id);
      const rows = await query(`UPDATE feedback SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${SELECT_COLS}`, params);
      return rows[0] ? toRow(rows[0]) : null;
    },
    async screenshot(id) {
      await ensure();
      const rows = await query(`SELECT screenshot_b64, screenshot_type FROM feedback WHERE id = $1`, [id]);
      const r = rows[0];
      if (!r || !r.screenshot_b64) return null;
      return { data: Buffer.from(String(r.screenshot_b64), 'base64'), type: String(r.screenshot_type) };
    },
  };
}

let store: FeedbackStore | null = null;
let override: FeedbackStore | null = null;

/** Tests inject an in-process Postgres here. */
export function setFeedbackStoreForTests(s: FeedbackStore | null) {
  override = s;
}

/** Returns the store, or null when no database is configured. */
export function getFeedbackStore(): FeedbackStore | null {
  if (override) return override;
  if (!isNeonConfigured()) return null;
  if (!store) store = createFeedbackStore((sql, params) => executeNeonQuery<Record<string, unknown>>(sql, (params || []) as (string | number | boolean | null)[]));
  return store;
}
