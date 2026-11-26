import fs from 'fs';
import path from 'path';
import { isNeonConfigured, executeNeonQuery } from './neon-db';

/**
 * Durable storage for the application's account/workspace state.
 *
 * The whole state document is stored as one JSONB row with a version number.
 * Every write is a compare-and-swap on that version, so two serverless
 * instances can never silently overwrite each other's changes: the loser
 * gets a StateConflictError and the caller retries on fresh data.
 *
 * Production (DATABASE_URL set): Postgres/Neon table `app_state`.
 * Local development without DATABASE_URL: a JSON file under DATA_DIR.
 * Production without DATABASE_URL: refuses to start instead of losing data.
 */

export interface StoredState {
  data: unknown;
  version: number;
}

export interface LegacyUserRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  password_hash: string;
  salt: string;
  email_verified: boolean | null;
  verification_code: string | null;
  verification_expires: string | Date | null;
  account_status: string | null;
  subscription: unknown;
  usage: unknown;
  created_at: string | Date | null;
}

export interface StateBackend {
  readonly kind: 'postgres' | 'file' | 'memory';
  read(): Promise<StoredState | null>;
  /** Inserts the first version. Returns false when another writer created it first. */
  create(data: unknown): Promise<boolean>;
  /** Writes if the stored version still equals expectedVersion. Returns the new version, or null on conflict. */
  write(data: unknown, expectedVersion: number): Promise<number | null>;
  /** Rows of the old `users` mirror table, imported once when app_state is first created. */
  readLegacyUsers(): Promise<LegacyUserRow[]>;
}

export class StateConflictError extends Error {
  constructor() {
    super('Application state was changed by another request. Retry with fresh data.');
    this.name = 'StateConflictError';
  }
}

export type QueryFn = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const STATE_KEY = 'main';

export function createPostgresBackend(query: QueryFn): StateBackend {
  let tableReady: Promise<void> | null = null;

  const ensureTable = () => {
    if (!tableReady) {
      tableReady = query(
        `CREATE TABLE IF NOT EXISTS app_state (
           key TEXT PRIMARY KEY,
           data JSONB NOT NULL,
           version BIGINT NOT NULL DEFAULT 1,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`
      ).then(
        () => undefined,
        (err) => {
          tableReady = null;
          throw err;
        }
      );
    }
    return tableReady;
  };

  const parseData = (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value);

  return {
    kind: 'postgres',
    async read() {
      await ensureTable();
      const rows = await query('SELECT data, version FROM app_state WHERE key = $1', [STATE_KEY]);
      if (rows.length === 0) return null;
      return { data: parseData(rows[0].data), version: Number(rows[0].version) };
    },
    async create(data) {
      await ensureTable();
      const rows = await query(
        `INSERT INTO app_state (key, data, version) VALUES ($1, $2::jsonb, 1)
         ON CONFLICT (key) DO NOTHING RETURNING version`,
        [STATE_KEY, JSON.stringify(data)]
      );
      return rows.length > 0;
    },
    async write(data, expectedVersion) {
      await ensureTable();
      const rows = await query(
        `UPDATE app_state SET data = $2::jsonb, version = version + 1, updated_at = NOW()
         WHERE key = $1 AND version = $3 RETURNING version`,
        [STATE_KEY, JSON.stringify(data), expectedVersion]
      );
      return rows.length > 0 ? Number(rows[0].version) : null;
    },
    async readLegacyUsers() {
      const exists = await query(`SELECT to_regclass('public.users') IS NOT NULL AS present`);
      if (!exists[0]?.present) return [];
      const rows = await query(
        `SELECT id, name, email, phone, role, password_hash, salt, email_verified,
                verification_code, verification_expires, account_status, subscription, usage, created_at
         FROM users`
      );
      return rows.map((r) => ({
        ...(r as unknown as LegacyUserRow),
        subscription: parseData(r.subscription),
        usage: parseData(r.usage),
      }));
    },
  };
}

export function createFileBackend(file: string): StateBackend {
  const readFile = (): { data: unknown; version: number } | null => {
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    // Files written before versioning hold the bare state document.
    if (parsed && typeof parsed === 'object' && '__stateVersion' in parsed && 'data' in parsed) {
      return { data: parsed.data, version: Number(parsed.__stateVersion) };
    }
    return { data: parsed, version: 1 };
  };
  const writeFile = (data: unknown, version: number) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ __stateVersion: version, data }, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
  };
  return {
    kind: 'file',
    async read() {
      return readFile();
    },
    async create(data) {
      if (fs.existsSync(file)) return false;
      writeFile(data, 1);
      return true;
    },
    async write(data, expectedVersion) {
      const current = readFile();
      if (!current || current.version !== expectedVersion) return null;
      writeFile(data, expectedVersion + 1);
      return expectedVersion + 1;
    },
    async readLegacyUsers() {
      return [];
    },
  };
}

let backendOverride: StateBackend | null = null;
let cachedBackend: StateBackend | null = null;

/** Used by tests to run the real store against an isolated backend. */
export function setStateBackendForTests(backend: StateBackend | null) {
  backendOverride = backend;
  cachedBackend = null;
}

export function getStateBackend(): StateBackend {
  if (backendOverride) return backendOverride;
  if (cachedBackend) return cachedBackend;

  if (isNeonConfigured()) {
    cachedBackend = createPostgresBackend((sql, params) =>
      executeNeonQuery<Record<string, unknown>>(sql, (params || []) as (string | number | boolean | null)[])
    );
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is not set. Refusing to store accounts on the local filesystem in production, because it is not persistent.'
    );
  } else {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '.data');
    cachedBackend = createFileBackend(process.env.DB_FILE || path.join(dataDir, 'freepdfkit-db.json'));
  }
  return cachedBackend;
}
