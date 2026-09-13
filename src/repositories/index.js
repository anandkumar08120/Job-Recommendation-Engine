import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createMemoryRepositories } from './memory/index.js';

/**
 * Composition root for persistence.
 *
 * The driver is chosen once, at boot, from config. Everything above this line
 * depends on the repository contract rather than on Postgres or on a Map, which
 * is what lets the whole API suite run against the in-memory driver with no
 * database and no mocking framework.
 */
export const createRepositories = async ({ driver = config.storage.driver } = {}) => {
  if (driver === 'postgres') {
    const { createPostgresRepositories } = await import('./postgres/index.js');
    logger.info({ driver }, 'using postgres persistence');
    return createPostgresRepositories();
  }

  logger.info({ driver: 'memory' }, 'using in-memory persistence (data is not durable)');
  return createMemoryRepositories();
};
