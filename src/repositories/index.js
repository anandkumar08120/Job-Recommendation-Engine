import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { createMemoryRepositories } from './memory/index.js';

export const createRepositories = async ({ driver = config.storage.driver } = {}) => {
  if (driver === 'postgres') {
    const { createPostgresRepositories } = await import('./postgres/index.js');
    logger.info({ driver }, 'using postgres persistence');
    return createPostgresRepositories();
  }

  logger.info({ driver: 'memory' }, 'using in-memory persistence (data is not durable)');
  return createMemoryRepositories();
};
