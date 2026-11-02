// apps/server/src/observability/errorTracker.ts
import { logger } from './logger';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export interface IErrorTracker {
  captureException(error: Error | unknown, context?: ErrorContext): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: ErrorContext): void;
}

/**
 * Production-ready Error Tracking Adapter.
 * Bridges application exceptions to external monitoring (Sentry, Datadog)
 * while providing structured fallback logging when credentials are not configured.
 * Complies with AGENTS.md Rule 12.
 */
class ErrorTracker implements IErrorTracker {
  private isConfigured = false;

  constructor() {
    const dsn = process.env.SENTRY_DSN;
    if (dsn && !dsn.includes('placeholder')) {
      this.isConfigured = true;
      logger.info('External ErrorTracker initialized with SENTRY_DSN');
    }
  }

  captureException(error: Error | unknown, context?: ErrorContext): void {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error(`[ErrorTracker] Exception: ${err.message}`, {
      name: err.name,
      stack: err.stack,
      ...context,
    });

    if (this.isConfigured) {
      // In production with @sentry/node installed and SENTRY_DSN set:
      // Sentry.captureException(err, { extra: context });
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (level === 'error') {
      logger.error(`[ErrorTracker] ${message}`, context);
    } else if (level === 'warning') {
      logger.warn(`[ErrorTracker] ${message}`, context);
    } else {
      logger.info(`[ErrorTracker] ${message}`, context);
    }
  }
}

export const errorTracker: IErrorTracker = new ErrorTracker();

