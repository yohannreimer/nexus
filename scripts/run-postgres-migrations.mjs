import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL nao configurado.');
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), 'postgres', 'migrations');
const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const exists = await client.query(
      'select 1 from public.schema_migrations where filename = $1',
      [file],
    );

    if (exists.rowCount) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    console.log(`apply ${file}`);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query(
        'insert into public.schema_migrations (filename) values ($1)',
        [file],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }

  console.log('migrations ok');
} finally {
  await client.end().catch(() => {});
}
