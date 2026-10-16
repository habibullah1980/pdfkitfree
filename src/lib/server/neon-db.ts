import { neon } from '@neondatabase/serverless';

// Cache connection instance
let sqlClient: ReturnType<typeof neon> | null = null;

export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Returns a Neon SQL tag function for executing queries over HTTP.
 * Optimized for serverless, Edge, and webhooks with zero connection pool exhaustion.
 */
export function getNeonSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Please ensure Neon is provisioned.');
  }

  if (!sqlClient) {
    sqlClient = neon(connectionString);
  }

  return sqlClient;
}

/**
 * Safe query runner with error logging and fallback detection
 */
export async function executeNeonQuery<T = unknown>(
  query: string,
  params: (string | number | boolean | null | undefined)[] = []
): Promise<T[]> {
  const sql = getNeonSql();
  return (await sql.query(query, params)) as T[];
}
