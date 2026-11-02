// apps/server/src/adapters/tmdb/cache.ts
import { redisClient } from '../../queues/connection';
import { logger } from '../../observability/logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory fallback cache when Redis is disconnected or offline
const memoryStore = new Map<string, CacheEntry<unknown>>();

// Stale cache store for serving stale data during outages
const staleStore = new Map<string, unknown>();

export class MovieCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (redisClient.status === 'ready') {
        const value = await redisClient.get(key);
        if (value) {
          const parsed = JSON.parse(value) as T;
          staleStore.set(key, parsed);
          return parsed;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Redis cache get error, falling back to memory', { key, error: msg });
    }

    // Memory fallback
    const memEntry = memoryStore.get(key);
    if (memEntry) {
      if (Date.now() < memEntry.expiresAt) {
        return memEntry.data as T;
      }
      memoryStore.delete(key);
    }

    return null;
  }

  static async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Store in stale fallback map
    staleStore.set(key, value);

    // Try Redis
    try {
      if (redisClient.status === 'ready') {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Redis cache set error, saving to memory fallback', { key, error: msg });
    }

    // Memory store fallback
    memoryStore.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static getStale<T>(key: string): T | null {
    const stale = staleStore.get(key);
    return stale ? (stale as T) : null;
  }
}

