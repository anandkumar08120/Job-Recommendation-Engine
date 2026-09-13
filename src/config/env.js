import 'dotenv/config';

/**
 * Centralised, validated environment access.
 *
 * Everything that reads `process.env` in this codebase does it here, so the rest
 * of the app depends on a plain frozen object instead of ambient global state.
 * That keeps modules trivially testable and makes misconfiguration fail fast at
 * boot rather than on the first request that happens to need the value.
 */

const asInt = (value, fallback, name) => {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for env var ${name}: "${value}"`);
  }
  return parsed;
};

const asEnum = (value, allowed, fallback, name) => {
  if (value === undefined || value === '') return fallback;
  if (!allowed.includes(value)) {
    throw new Error(`Invalid value for env var ${name}: "${value}". Expected one of: ${allowed.join(', ')}`);
  }
  return value;
};

const nodeEnv = asEnum(
  process.env.NODE_ENV,
  ['development', 'test', 'production'],
  'development',
  'NODE_ENV',
);

const storageDriver = asEnum(
  process.env.STORAGE_DRIVER,
  ['memory', 'postgres'],
  'memory',
  'STORAGE_DRIVER',
);

if (storageDriver === 'postgres' && !process.env.DATABASE_URL) {
  throw new Error('STORAGE_DRIVER=postgres requires DATABASE_URL to be set');
}

export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: asInt(process.env.PORT, 3000, 'PORT'),
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'test' ? 'silent' : 'info'),
  storage: Object.freeze({
    driver: storageDriver,
    databaseUrl: process.env.DATABASE_URL,
    poolMax: asInt(process.env.PGPOOL_MAX, 10, 'PGPOOL_MAX'),
  }),
  recommendations: Object.freeze({
    defaultLimit: asInt(process.env.DEFAULT_RECOMMENDATION_LIMIT, 10, 'DEFAULT_RECOMMENDATION_LIMIT'),
    maxLimit: asInt(process.env.MAX_RECOMMENDATION_LIMIT, 100, 'MAX_RECOMMENDATION_LIMIT'),
  }),
  shutdownTimeoutMs: asInt(process.env.SHUTDOWN_TIMEOUT_MS, 10_000, 'SHUTDOWN_TIMEOUT_MS'),
});
