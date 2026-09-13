import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

/**
 * The single place an error becomes an HTTP response.
 *
 * Expected failures (4xx) are logged at warn with their detail; unexpected ones
 * are logged at error with the stack and answered with a generic message plus a
 * request id, so the client gets something actionable to quote in a ticket while
 * internals stay out of the response body.
 */
// The unused 4th argument is required: Express identifies error handlers by arity.
export const errorHandler = (error, req, res, _next) => {
  const requestId = req.id;

  if (error instanceof AppError) {
    logger.warn({ requestId, code: error.code, details: error.details }, error.message);
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details, requestId },
    });
  }

  // Body parser rejections (malformed JSON, oversized payload) arrive as plain
  // http-errors with a status already attached.
  if (error.status && error.status < 500) {
    logger.warn({ requestId, type: error.type }, error.message);
    return res.status(error.status).json({
      error: { code: 'BAD_REQUEST', message: error.message, requestId },
    });
  }

  logger.error({ requestId, err: error }, 'unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId },
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}`,
      requestId: req.id,
    },
  });
};
