import pino from 'pino';
import { config } from '../config/env.js';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'job-match-api' },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
  transport: config.isProduction || config.isTest ? undefined : { target: 'pino-pretty' },
});
