import { PGlite } from '@electric-sql/pglite';
import { createPostgresBackend, type QueryFn } from '../../src/lib/server/app-state-store';

/** A real (in-process) Postgres used to exercise the production storage code path. */
export async function createTestPostgres() {
  const pg = new PGlite();
  const query: QueryFn = async (sql, params) => {
    const res = await pg.query(sql, (params || []) as unknown[]);
    return res.rows as Record<string, unknown>[];
  };
  return { pg, query, backend: createPostgresBackend(query) };
}
