import pg from 'pg';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

let pool;

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
