import { isNeonConfigured, executeNeonQuery } from './neon-db';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const COUNTER_FILE = path.join(DATA_DIR, 'visitor-counter.json');

// Ensure local file storage exists
function getLocalCount(): number {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(COUNTER_FILE)) {
      // Initialize with realistic base or 1
      fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: 12458 }), 'utf-8');
      return 12458;
    }
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
    return typeof data.count === 'number' ? data.count : 12458;
  } catch (err) {
    console.error('[VisitorCounter] Failed to read local count:', err);
    return 12458;
  }
}

function setLocalCount(count: number): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count, updatedAt: new Date().toISOString() }), 'utf-8');
  } catch (err) {
    console.error('[VisitorCounter] Failed to save local count:', err);
  }
}

let tableChecked = false;

async function ensureNeonTable(): Promise<void> {
  if (tableChecked) return;
  try {
    await executeNeonQuery(`
      CREATE TABLE IF NOT EXISTS site_stats (
        key VARCHAR(50) PRIMARY KEY,
        value BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    // Ensure the row exists with an initial base count if not present
    await executeNeonQuery(`
      INSERT INTO site_stats (key, value)
      VALUES ('website_visits', 12458)
      ON CONFLICT (key) DO NOTHING;
    `);
    tableChecked = true;
  } catch (err) {
    console.error('[VisitorCounter] Failed to ensure Neon site_stats table:', err);
    throw err;
  }
}

/**
 * Returns the current total website visits without incrementing
 */
export async function getVisitorCount(): Promise<number> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonTable();
      const rows = await executeNeonQuery<{ value: string | number }>(
        `SELECT value FROM site_stats WHERE key = 'website_visits';`
      );
      if (rows && rows.length > 0) {
        return Number(rows[0].value);
      }
      throw new Error("No 'website_visits' row found in site_stats table");
    } catch (err) {
      console.error('[VisitorCounter] Neon query error in getVisitorCount:', err);
      // In production with DATABASE_URL, do not return local fabricated fallback
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  return getLocalCount();
}

/**
 * Safely increments and returns the new total website visits count
 */
export async function incrementVisitorCount(): Promise<number> {
  if (isNeonConfigured()) {
    try {
      await ensureNeonTable();
      const rows = await executeNeonQuery<{ value: string | number }>(`
        INSERT INTO site_stats (key, value, updated_at)
        VALUES ('website_visits', 12459, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = site_stats.value + 1, updated_at = NOW()
        RETURNING value;
      `);
      if (rows && rows.length > 0) {
        const count = Number(rows[0].value);
        setLocalCount(count);
        return count;
      }
      throw new Error('Failed to retrieve incremented value from site_stats');
    } catch (err) {
      console.error('[VisitorCounter] Neon increment error:', err);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  // Local fallback / dev mode
  const current = getLocalCount();
  const next = current + 1;
  setLocalCount(next);
  return next;
}
