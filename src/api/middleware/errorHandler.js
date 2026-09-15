import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export const errorHandler = (error, req, res, _next) => {
  const requestId = req.id;

  if (error instanceof AppError) {
    logger.warn({ requestId, code: error.code, details: error.details }, error.message);
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details, requestId },
    });
  }
  
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
