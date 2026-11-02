// apps/server/src/queues/webhook.queue.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { WebhookJobData } from '../schemas/webhook.schema';
import { BookingService } from '../services/booking.service';
import { logger } from '../observability/logger';

export const WEBHOOK_QUEUE_NAME = 'webhook-processing-queue';

export let webhookQueue: Queue<WebhookJobData> | null = null;

if (process.env.NODE_ENV !== 'test') {
  try {
    webhookQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    });

    webhookQueue.on('error', (err) => {
      logger.warn('Webhook queue connection warning', { error: err.message });
    });
  } catch (err: any) {
    logger.warn('Could not initialize BullMQ webhook queue', { error: err.message });
  }
}

export async function enqueueWebhookJob(data: WebhookJobData) {
  const jobId = `flw-wh-${data.providerEventId}`;
  logger.info('Handling webhook processing job', {
    jobId,
    txRef: data.txRef,
    transactionId: data.transactionId,
    requestId: data.requestId,
  });

  if (webhookQueue) {
    try {
      return await webhookQueue.add('process-flutterwave-webhook', data, { jobId });
    } catch (err: any) {
      logger.warn('Failed to enqueue job to Redis queue, executing safe fallback processing', {
        error: err.message,
      });
    }
  }

  // Graceful fallback when Redis queue is offline (Rule 10: fail safe, process durably)
  setImmediate(async () => {
    try {
      await BookingService.confirmPaidBooking({
        webhookEventId: data.webhookEventId,
        transactionId: data.transactionId,
        txRef: data.txRef,
        amountKobo: data.amountInKobo,
        currency: data.currency,
        providerEventId: data.providerEventId,
        requestId: data.requestId,
      });
    } catch (fallbackErr: any) {
      logger.error('Direct fallback processing error', { error: fallbackErr.message });
    }
  });

  return null;
}
