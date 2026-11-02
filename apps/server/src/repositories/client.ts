// apps/server/src/repositories/client.ts
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

/**
 * Ensures optimal connection pooling parameters are attached to the PostgreSQL connection string.
 *
 * Sizing Justification (PRD Requirement 5 & AGENTS.md Rule 8):
 * - Formula: Pool Size = 2 * vCPUs + IO Allowance (defaulting to 20 connections per instance).
 * - Sizing at 20 prevents PostgreSQL connection starvation and context-switch thrashing while
 *   serving high-concurrency Node.js event loops.
 * - pool_timeout=10 (seconds) ensures fast failure under extreme load rather than hanging HTTP requests.
 */
function formatPoolUrl(rawUrl?: string, defaultLimit = 20): string | undefined {
  if (!rawUrl) return undefined;
  if (rawUrl.includes('connection_limit=')) return rawUrl;
  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}connection_limit=${defaultLimit}&pool_timeout=10`;
}

/**
 * Primary Database Client (Writes and Consistency-Sensitive Reads).
 * All transactions, mutations, holds, and inventory reads route strictly to the primary.
 */
export const writeClient = new PrismaClient({
  datasources: {
    db: {
      url: formatPoolUrl(process.env.DATABASE_URL, 20),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Read Replica Database Client (Stale-Tolerant Reads).
 * Movie catalogues, upcoming titles, and general browsing queries route to the replica.
 * Falls back to DATABASE_URL in single-node environments (e.g. free tier).
 */
export const readClient = new PrismaClient({
  datasources: {
    db: {
      url: formatPoolUrl(process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL, 20),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
