import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Configure your PostgreSQL connection string (e.g. from Railway) in server/.env'
  );
}

// Determine TLS behavior from the connection string.
// - If the URL already carries sslmode/ssl params, node-postgres handles SSL itself.
// - Otherwise: local Postgres usually needs none; remote (Railway) needs TLS.
const url = new URL(connectionString);
const hasSslParam = url.searchParams.has('sslmode') || url.searchParams.has('ssl');
const isLocal = /localhost|127\.0\.0\.1|::1/.test(url.hostname);

export const pool = new Pool({
  connectionString,
  ssl: hasSslParam ? undefined : isLocal ? undefined : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('[postgres] idle client error', err);
});