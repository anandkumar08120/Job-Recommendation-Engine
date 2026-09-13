import pg from 'pg';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

let pool;

/**
 * One pool per process, created lazily.
 *
 * `pg` emits 'error' on idle clients dropped by the server (a restart, a
 * connection reaper). Without this listener that event is unhandled and takes
 * the process down, which is a genuinely surprising way to lose an API.
 */
export const getPool = () => {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.storage.databaseUrl,
      max: config.storage.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (error) => {
      logger.error({ err: error }, 'idle postgres client error');
    });
  }
  return pool;
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
