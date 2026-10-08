import { readFile } from 'node:fs/promises';
export async function migrate(db) { await db.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8')); }
if (process.argv[1]?.endsWith('migrate.js')) {
  const { db } = await import('./db.js');
  try { await migrate(db); console.log('Database schema ready.'); } finally { await db.end(); }
}
