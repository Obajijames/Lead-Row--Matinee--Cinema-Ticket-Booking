import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logger';
import { errorTracker } from '../observability/errorTracker';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id || 'unknown';
  const log = logger.child({ requestId });

  if (err instanceof AppError) {
    log.warn(`Application error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
        details: err.details,
      },
    });
    return;
  }

  // Handle unhandled unexpected errors
  log.error(`Unhandled internal error: ${err.message}`, {
    stack: err.stack,
  });

  errorTracker.captureException(err, {
    requestId,
    path: req.path,
    method: req.method,
    statusCode: 500,
  });

  // Never leak internal stack traces to clients
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
      requestId,
    },
  });
}

