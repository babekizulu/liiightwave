import pg from 'pg';
import { readFileSync } from 'node:fs';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. See .env.example.');
export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  ...(process.env.PGSSLMODE === 'require' ? {ssl: { rejectUnauthorized: true, ...(process.env.PGSSLROOTCERT ? {ca: readFileSync(process.env.PGSSLROOTCERT,'utf8')} : {}) }} : {})
});
db.on('error', () => console.error('Unexpected PostgreSQL connection error'));
