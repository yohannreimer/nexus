import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurado');
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return pool;
}

export async function queryPostgres<T = unknown>(text: string, values: unknown[] = []) {
  const result = await getPostgresPool().query<T>(text, values);
  return result.rows;
}
