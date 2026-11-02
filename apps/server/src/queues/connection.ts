import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

import Redis from 'ioredis';
import { logger } from '../observability/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const retryStrategy = (times: number) => {
  if (process.env.NODE_ENV === 'test' || times > 2) {
    return null; // Stop retrying to avoid hanging tests or processes when Redis is offline
  }
  return Math.min(times * 100, 2000);
};

/**
 * Shared BullMQ Redis Connection options.
 * Requires maxRetriesPerRequest: null as mandated by BullMQ.
 */
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy,
});

/**
 * Standard Redis client for application caching, locks, and rate limiting.
 */
export const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
  retryStrategy,
});

redisConnection.on('error', (err) => {
  // Suppress verbose connection refused logs in test mode
  if (process.env.NODE_ENV !== 'test') {
    logger.warn('BullMQ Redis connection warning', { error: err.message });
  }
});

redisClient.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    logger.warn('Application Redis client warning', { error: err.message });
  }
});
