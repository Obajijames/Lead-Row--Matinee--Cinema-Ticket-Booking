// apps/server/src/queues/hold-reconciliation.queue.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { logger } from '../observability/logger';

export const RECONCILIATION_QUEUE_NAME = 'hold-reconciliation-queue';

export const holdReconciliationQueue = new Queue(RECONCILIATION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 200,
    },
  },
});

holdReconciliationQueue.on('error', (err) => {
  logger.warn('Hold reconciliation queue connection warning', { error: err.message });
});

export async function scheduleHoldReconciliation() {
  // Recurring cron or interval: every 60 seconds
  await holdReconciliationQueue.upsertJobScheduler(
    'periodic-hold-reconciliation',
    { every: 60000 },
    {
      name: 'reconcile-expired-holds',
      data: { trigger: 'cron' },
    }
  );
  logger.info('Scheduled periodic hold reconciliation every 60s');
}

