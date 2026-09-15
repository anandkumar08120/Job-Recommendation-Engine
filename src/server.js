import { createApp } from './api/app.js';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';

const start = async () => {
  const repositories = await createRepositories();
  const services = createServices({ repositories });
  const app = createApp({ services, repositories });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'job-match-api listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    const timer = setTimeout(() => {
      logger.error('graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, config.shutdownTimeoutMs).unref();

    server.close(async (error) => {
      if (error) logger.error({ err: error }, 'error closing http server');
      await repositories.close();
      clearTimeout(timer);
      process.exit(error ? 1 : 0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection');
  });
};

start().catch((error) => {
  logger.error({ err: error }, 'failed to start');
  process.exit(1);
});
