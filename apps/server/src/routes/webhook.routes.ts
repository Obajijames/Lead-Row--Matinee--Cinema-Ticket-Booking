// apps/server/src/routes/webhook.routes.ts
import { Router, Request, Response } from 'express';
import { FlutterwaveAdapter } from '../adapters/flutterwave/flutterwave.adapter';
import { FlutterwaveWebhookPayloadSchema } from '../schemas/webhook.schema';
import { BookingService } from '../services/booking.service';
import { enqueueWebhookJob } from '../queues/webhook.queue';
import { logger } from '../observability/logger';

export const webhookRouter: Router = Router();

/**
 * POST /v1/webhooks/flutterwave
 * Handles verified asynchronous payment notifications from Flutterwave.
 */
webhookRouter.post('/flutterwave', async (req: Request, res: Response) => {
  const signature = req.headers['verif-hash'] as string | undefined;
  const requestId = req.headers['x-request-id'] as string | undefined;

  // 1. Signature Verification
  const isValidSignature = FlutterwaveAdapter.verifyWebhookSignature(signature);
  if (!isValidSignature) {
    logger.warn('Rejected webhook: invalid signature header', { requestId });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_WEBHOOK',
        message: 'Invalid webhook signature hash',
      },
    });
  }

  // 2. Validate payload schema
  const parsed = FlutterwaveWebhookPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('Webhook payload does not match expected schema', {
      errors: parsed.error.format(),
      requestId,
    });
    // Return 200 to acknowledge non-matching events (e.g. transfer.completed)
    return res.status(200).json({ received: true, ignored: true });
  }

  const { event, data } = parsed.data;

  // We only process charge.completed events
  if (event !== 'charge.completed' || data.status !== 'successful') {
    logger.info('Ignoring non-successful or non-charge webhook event', {
      event,
      status: data.status,
      requestId,
    });
    return res.status(200).json({ received: true, ignored: true });
  }

  const providerEventId = String(data.id);
  const amountInKobo = Math.round(data.amount * 100);

  try {
    // 3. Persist receipt before asynchronous processing (Idempotency guarantee)
    const { event: webhookRecord, isDuplicate } = await BookingService.recordWebhookReceipt({
      provider: 'flutterwave',
      providerEventId,
      rawPayload: req.body,
    });

    if (isDuplicate && webhookRecord.isProcessed) {
      logger.info('Webhook event already processed earlier, returning 200 OK', {
        providerEventId,
        requestId,
      });
      return res.status(200).json({ received: true, status: 'already_processed' });
    }

    // 4. In a serverless environment (Vercel), process immediately since background daemon workers cannot run
    if (process.env.VERCEL || process.env.SERVERLESS_SYNC_WEBHOOK === 'true') {
      try {
        const confirmResult = await BookingService.confirmPaidBooking({
          webhookEventId: webhookRecord.id,
          transactionId: data.id,
          txRef: data.tx_ref,
          amountKobo: amountInKobo,
          currency: data.currency,
          providerEventId,
          requestId,
        });

        logger.info('Serverless webhook processed and booking confirmed', {
          bookingId: confirmResult.bookingId,
          requestId,
        });

        return res.status(200).json({
          received: true,
          status: 'confirmed',
          bookingId: confirmResult.bookingId,
        });
      } catch (confirmErr: any) {
        logger.error('Error confirming booking in serverless webhook mode', {
          error: confirmErr.message,
          requestId,
        });
        return res.status(500).json({
          success: false,
          error: {
            code: 'WEBHOOK_CONFIRM_ERROR',
            message: confirmErr.message,
          },
        });
      }
    }

    // Standard persistent container mode: enqueue BullMQ background processing job
    await enqueueWebhookJob({
      webhookEventId: webhookRecord.id,
      provider: 'flutterwave',
      providerEventId,
      transactionId: data.id,
      txRef: data.tx_ref,
      amountInKobo,
      currency: data.currency,
      customerEmail: data.customer?.email,
      customerName: data.customer?.name,
      requestId,
    });

    return res.status(200).json({
      received: true,
      eventId: webhookRecord.id,
    });
  } catch (err: any) {
    logger.error('Error handling webhook receipt', { error: err.message, requestId });
    return res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_RECEIPT_ERROR',
        message: 'Failed to record webhook receipt',
      },
    });
  }
});
