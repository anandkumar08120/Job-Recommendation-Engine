import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config/env.js';
import { logger } from '../src/lib/logger.js';
import { closePool, getPool } from '../src/repositories/postgres/pool.js';

/**
 * Applies db/init.sql. The file is idempotent (CREATE TABLE IF NOT EXISTS), so
 * re-running is safe -- enough for this exercise, though a real service would
 * want versioned, ordered migrations. See README.
 */
const run = async () => {
  if (config.storage.driver !== 'postgres') {
    throw new Error('STORAGE_DRIVER must be "postgres" to run migrations');
  }

  const sqlPath = fileURLToPath(new URL('../db/init.sql', import.meta.url));
  const sql = await readFile(sqlPath, 'utf8');

  await getPool().query(sql);
  logger.info('migrations applied');
  await closePool();
};

run().catch(async (error) => {
  logger.error({ err: error }, 'migration failed');
  await closePool();
  process.exit(1);
});
