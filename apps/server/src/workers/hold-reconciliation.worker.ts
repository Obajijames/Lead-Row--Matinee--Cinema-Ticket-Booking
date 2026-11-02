// apps/server/src/workers/hold-reconciliation.worker.ts
import { Worker, Job } from 'bullmq';
import { redisConnection, redisClient } from '../queues/connection';
import { writeClient } from '../repositories/client';
import { logger } from '../observability/logger';
import { HoldStatus } from '@prisma/client';
import { RECONCILIATION_QUEUE_NAME } from '../queues/hold-reconciliation.queue';
import { BookingService } from '../services/booking.service';

export function createHoldReconciliationWorker(): Worker | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const worker = new Worker(
      RECONCILIATION_QUEUE_NAME,
      async (job: Job) => {
        logger.info('Starting hold reconciliation job', { jobId: job.id });

        const now = new Date();

        // Find all expired active holds
        const expiredHolds = await writeClient.seatHold.findMany({
          where: {
            status: HoldStatus.ACTIVE,
            expiresAt: { lt: now },
          },
          select: {
            id: true,
            showtimeId: true,
            seatId: true,
            holdToken: true,
          },
          take: 500,
        });

        if (expiredHolds.length === 0) {
          return { reconciled: 0 };
        }

        // Mark as EXPIRED in PostgreSQL
        const updateResult = await writeClient.seatHold.updateMany({
          where: {
            id: { in: expiredHolds.map((h) => h.id) },
            status: HoldStatus.ACTIVE,
          },
          data: {
            status: HoldStatus.EXPIRED,
          },
        });

        // Best effort Redis cleanup
        try {
          const pipeline = redisClient.pipeline();
          for (const hold of expiredHolds) {
            const redisKey = `hold:${hold.showtimeId}:${hold.seatId}`;
            pipeline.del(redisKey);
          }
          await pipeline.exec();
        } catch (err: any) {
          logger.warn('Redis key cleanup failed during reconciliation', {
            error: err.message,
          });
        }

        logger.info('Hold reconciliation completed', {
          reconciledCount: updateResult.count,
        });

        // 2. Reconcile abandoned checkouts (PENDING_PAYMENT > 15 minutes)
        const abandonedResult = await BookingService.reconcileAbandonedCheckouts(15);

        return {
          reconciledHolds: updateResult.count,
          releasedAbandonedCheckouts: abandonedResult.cancelledCount,
        };
      },
      {
        connection: redisConnection,
        concurrency: 1,
      }
    );

    worker.on('error', (err: Error) => {
      logger.warn('BullMQ Hold reconciliation worker error (Redis connection)', { error: err.message });
    });

    worker.on('completed', (job: Job) => {
      logger.info('Hold reconciliation worker completed', { jobId: job.id, result: job.returnvalue });
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error('Hold reconciliation worker failed', { jobId: job?.id, error: err.message });
    });

    return worker;
  } catch (err: any) {
    logger.warn('Could not instantiate hold reconciliation worker', { error: err.message });
    return null;
  }
}

export const holdReconciliationWorker = createHoldReconciliationWorker();
