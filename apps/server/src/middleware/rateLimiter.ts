// apps/server/src/middleware/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../queues/connection';

interface RateLimiterOptions {
  windowMs: number; // e.g. 60000 (1 minute)
  max: number; // e.g. 60 requests
  keyPrefix?: string;
}

// In-memory fallback map when Redis is not active
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

/**
 * Dual-Key Rate Limiter: Enforces rate limits per IP and per authenticated User ID.
 * Complies strictly with PRD Requirement 5 & AGENTS.md Rule 5.
 */
export function rateLimiter(options: RateLimiterOptions) {
  const { windowMs, max, keyPrefix = 'rl:api' } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId =
      (req as any).user?.id ||
      (req.headers['x-user-id'] as string) ||
      (req.body && typeof req.body.userId === 'string' ? req.body.userId : undefined);

    const keysToCheck: string[] = [`${keyPrefix}:ip:${ip}`];
    if (userId) {
      keysToCheck.push(`${keyPrefix}:user:${userId}`);
    }

    try {
      if (redisClient.status === 'ready') {
        for (const key of keysToCheck) {
          const count = await redisClient.incr(key);
          if (count === 1) {
            await redisClient.expire(key, windowSec);
          }

          if (count > max) {
            const ttl = await redisClient.ttl(key);
            const retryAfter = ttl > 0 ? ttl : windowSec;

            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please slow down and try again later.',
                retryAfterSeconds: retryAfter,
                requestId: req.id,
              },
            });
          }
        }

        return next();
      }
    } catch {
      // Redis error, proceed to memory fallback
    }

    // In-memory fallback
    const now = Date.now();
    for (const key of keysToCheck) {
      const entry = memoryCounters.get(key);

      if (!entry || now > entry.resetAt) {
        memoryCounters.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
        if (entry.count > max) {
          const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please slow down and try again later.',
              retryAfterSeconds: retryAfter,
              requestId: req.id,
            },
          });
        }
      }
    }

    return next();
  };
}
