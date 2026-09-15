import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes/index.js';
import { createHealthRouter } from './routes/health.js';

export const createApp = ({ services, repositories }) => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));

  app.use((req, _res, next) => {
    req.id = req.headers['x-request-id'] ?? randomUUID();
    next();
  });

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  app.use(createHealthRouter({ repositories }));

  const api = createApiRouter({ services });
  app.use('/', api);
  app.use('/api/v1', api);

  app.get('/', (_req, res) => {
    res.json({
      name: 'job-match-api',
      storage: repositories.driver,
      endpoints: [
        'POST /candidates',
        'GET  /candidates/:id',
        'GET  /candidates/:id/recommendations?limit=10',
        'POST /jobs',
        'GET  /jobs/:id',
        'GET  /jobs/:id/recommendations?limit=10',
        'GET  /health',
        'GET  /ready',
      ],
      defaultWeights: config.recommendations,
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
