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
const maxConnectAttempts = Number.parseInt(
  process.env.POSTGRES_MIGRATION_CONNECT_ATTEMPTS ?? '30',
  10,
);
const connectRetryDelayMs = Number.parseInt(
  process.env.POSTGRES_MIGRATION_RETRY_DELAY_MS ?? '2000',
  10,
);

const requiredBaseSchemaTables = [
  'public.ad_connections',
  'public.ad_platform_accounts',
  'public.ad_platform_campaigns',
  'public.ad_insights_snapshots',
  'public.agency_clients',
  'public.agency_client_accounts',
  'public.client_report_settings',
  'public.client_report_runs',
  'public.client_portals',
  'public.client_ai_profiles',
  'public.client_ai_analyses',
  'public.agency_ai_briefings',
  'public.agency_settings',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectWithRetry() {
  let lastError;

  for (let attempt = 1; attempt <= maxConnectAttempts; attempt += 1) {
    try {
      await client.connect();
      if (attempt > 1) {
        console.log(`connected to Postgres after ${attempt} attempts`);
      }
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `Postgres unavailable for migrations (${attempt}/${maxConnectAttempts}): ${error.message}`,
      );
      if (attempt < maxConnectAttempts) {
        await sleep(connectRetryDelayMs);
      }
    }
  }

  throw lastError;
}

async function findMissingRequiredTables() {
  const result = await client.query(
    `
      select table_name
      from unnest($1::text[]) as required(table_name)
      where to_regclass(required.table_name) is null
      order by table_name
    `,
    [requiredBaseSchemaTables],
  );

  return result.rows.map((row) => row.table_name);
}

async function applySqlFile(file) {
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
  await client.query('begin');
  try {
    await client.query(sql);
    await client.query(
      `
        insert into public.schema_migrations (filename)
        values ($1)
        on conflict (filename) do update set applied_at = now()
      `,
      [file],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

try {
  await connectWithRetry();
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

    console.log(`apply ${file}`);
    await applySqlFile(file);
  }

  const missingRequiredTables = await findMissingRequiredTables();
  if (missingRequiredTables.length) {
    console.warn(
      `required workspace tables missing after migrations: ${missingRequiredTables.join(', ')}`,
    );
    for (const file of files) {
      console.log(`repair ${file}`);
      await applySqlFile(file);
    }
  }

  const stillMissingRequiredTables = await findMissingRequiredTables();
  if (stillMissingRequiredTables.length) {
    throw new Error(
      `required workspace tables still missing: ${stillMissingRequiredTables.join(', ')}`,
    );
  }

  console.log('migrations ok');
} finally {
  await client.end().catch(() => {});
}
