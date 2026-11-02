// apps/server/src/workers/webhook.worker.ts
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/connection';
import { logger } from '../observability/logger';
import { FlutterwaveAdapter } from '../adapters/flutterwave/flutterwave.adapter';
import { BookingService } from '../services/booking.service';
import { WebhookJobData } from '../schemas/webhook.schema';
import { WEBHOOK_QUEUE_NAME } from '../queues/webhook.queue';
import { writeClient } from '../repositories/client';

export function createWebhookWorker(): Worker<WebhookJobData> | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const worker = new Worker<WebhookJobData>(
      WEBHOOK_QUEUE_NAME,
      async (job: Job<WebhookJobData>) => {
        const {
          webhookEventId,
          provider,
          providerEventId,
          transactionId,
          txRef,
          amountInKobo,
          currency,
          requestId,
        } = job.data;

        const log = logger.child({ requestId, jobId: job.id, webhookEventId, txRef });
        log.info('Processing webhook job', { attempt: job.attemptsMade + 1, providerEventId });

        // 1. Idempotency Check: Verify if event is already marked PROCESSED
        const isAlreadyProcessed = await BookingService.isWebhookProcessed(providerEventId);
        if (isAlreadyProcessed) {
          log.info('Webhook event already processed. Skipping replay.');
          return { status: 'ALREADY_PROCESSED' };
        }

        // 2. Server-to-server transaction verification with Flutterwave
        let verification;
        try {
          verification = await FlutterwaveAdapter.verifyTransaction(transactionId);
        } catch (err: any) {
          log.error('Error contacting Flutterwave verify API', { error: err.message });
          throw err; // Trigger BullMQ retry
        }

        if (verification.status === 'failed') {
          log.warn('Payment failed on Flutterwave. Releasing seats and cancelling booking.', { txRef });
          const payment = await writeClient.payment.findUnique({
            where: { providerRef: txRef },
            select: { bookingId: true },
          });
          if (payment) {
            await BookingService.cancelBooking(payment.bookingId, 'Flutterwave payment failed', requestId);
          }
          if (webhookEventId) {
            await writeClient.webhookEvent.update({
              where: { id: webhookEventId },
              data: { isProcessed: true, processedAt: new Date(), errorMessage: 'Payment failed upstream' },
            });
          }
          return { status: 'PAYMENT_FAILED_SEATS_RELEASED' };
        }

        if (verification.status !== 'successful') {
          log.warn('Transaction verification status is not successful', { status: verification.status });
          throw new Error(`Flutterwave transaction ${transactionId} status is ${verification.status}`);
        }

        // 3. Confirm booking, write append-only ledger entry, and issue ticket
        const result = await BookingService.confirmPaidBooking({
          webhookEventId,
          transactionId,
          txRef,
          amountKobo: verification.amountInKobo,
          currency: verification.currency,
          providerEventId,
          requestId,
        });

        log.info('Successfully confirmed booking via webhook worker', {
          bookingId: result.bookingId,
          ticketId: result.ticket.id,
        });

        return { status: 'CONFIRMED', bookingId: result.bookingId };
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    worker.on('error', (err: Error) => {
      logger.warn('BullMQ Webhook worker error (Redis connection)', { error: err.message });
    });

    worker.on('completed', (job: Job) => {
      logger.info('Webhook worker job completed', { jobId: job.id, returnvalue: job.returnvalue });
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error('Webhook worker job failed', {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err.message,
      });
    });

    return worker;
  } catch (err: any) {
    logger.warn('Could not instantiate BullMQ webhook worker', { error: err.message });
    return null;
  }
}

export const webhookWorker = createWebhookWorker();
