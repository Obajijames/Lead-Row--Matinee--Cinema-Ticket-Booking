---
name: implement-bullmq-worker
description: Build, configure, test, and monitor asynchronous BullMQ background workers and queues. Trigger words: BullMQ, queue, worker, job, background job, webhook processing, hold expiry, refund worker, dead letter, Redis connection.
---

## Overview

This skill provides step-by-step instructions for constructing idempotent, resilient BullMQ background queues and workers for Lead Row.
**Governing Rules:** `01-system-architecture.md`, `02-inventory-and-concurrency.md`, `03-financial-and-payments.md`, and `PRD.md` Section 5.6.

---

## Ordered Procedure

1. **Establish BullMQ-Compatible Redis Connection:**
   - Create or open `apps/server/src/queues/connection.ts`.
   - Configure `ioredis` with options required by BullMQ (`maxRetriesPerRequest: null`, `enableReadyCheck: false`).
   - Ensure the Redis deployment supports blocking list commands.

2. **Define Queue & Job Payload Schema:**
   - Create `apps/server/src/queues/[name].queue.ts`.
   - Define payload structure and validate with Zod before enqueueing.
   - Configure default job options:
     - `attempts`: 3 to 5
     - `backoff`: `{ type: 'exponential', delay: 2000 }`
     - `removeOnComplete`: `{ age: 86400, count: 1000 }`
     - `removeOnFail`: `{ age: 604800 }` (retain failures for 7 days)

3. **Implement Idempotent Worker Handler:**
   - Create `apps/server/src/workers/[name].worker.ts`.
   - Instantiate `new Worker(queueName, handler, { connection, concurrency })`.
   - **Step A (Idempotency Guard):** Check if the job reference (e.g. `webhookEventId`, `orderId`) was already processed. If so, return immediately.
   - **Step B (Correlation Context):** Extract `requestId` from job data and initialize structured logger.
   - **Step C (Execute Work):** Perform task (verify Flutterwave transaction, reconcile holds, or issue refunds).
   - **Step D (Durable Ledger / Confirmation):** Record append-only ledger entries within a transaction.

4. **Attach Lifecycle Observability Listeners:**
   - Listen to `worker.on('completed', ...)`: log execution duration and job ID.
   - Listen to `worker.on('failed', ...)`: log error stack, attempt number, and whether attempts are exhausted.

5. **Register Graceful Shutdown:**
   - In `apps/server/src/index.ts`, register `worker.close()` and `queue.close()` inside `SIGTERM` and `SIGINT` handlers.

---

## Code Skeleton

```typescript
// apps/server/src/workers/webhook.worker.ts
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/connection';
import { logger } from '../observability/logger';
import { FlutterwaveAdapter } from '../adapters/flutterwave/flutterwave.adapter';
import { BookingService } from '../services/booking.service';
import { WebhookJobData } from '../schemas/webhook.schema';

export const webhookWorker = new Worker<WebhookJobData>(
  'webhook-processing-queue',
  async (job: Job<WebhookJobData>) => {
    const { webhookEventId, providerEventId, transactionId, expectedAmountKobo, requestId } = job.data;
    const log = logger.child({ requestId, jobId: job.id, webhookEventId });

    log.info('Processing webhook job', { attempt: job.attemptsMade + 1 });

    // 1. Idempotency Check: Verify if event is already marked PROCESSED
    const isAlreadyProcessed = await BookingService.isWebhookProcessed(webhookEventId);
    if (isAlreadyProcessed) {
      log.info('Webhook event already processed. Skipping replay.');
      return { status: 'ALREADY_PROCESSED' };
    }

    // 2. Server-to-server transaction verification with Flutterwave
    const verification = await FlutterwaveAdapter.verifyTransaction(transactionId);
    if (verification.status !== 'successful') {
      log.error('Transaction verification failed at provider', { verification });
      throw new Error(`Flutterwave transaction ${transactionId} not successful: ${verification.status}`);
    }

    if (verification.amountInKobo !== expectedAmountKobo) {
      log.error('Transaction amount mismatch', {
        expected: expectedAmountKobo,
        received: verification.amountInKobo,
      });
      throw new Error('Payment amount mismatch between webhook and order');
    }

    // 3. Confirm booking and write append-only ledger
    await BookingService.confirmPaidBooking({
      webhookEventId,
      transactionId,
      amountKobo: verification.amountInKobo,
      currency: verification.currency,
      providerEventId,
      requestId,
    });

    log.info('Successfully confirmed booking via webhook worker');
    return { status: 'CONFIRMED' };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

webhookWorker.on('failed', (job, err) => {
  logger.error('Webhook worker job failed', {
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    error: err.message,
  });
});
```

---

## Common Traps

* **Incompatible Redis Deployment:** Connecting BullMQ to a REST-only or limited Redis instance that rejects `BRPOPLPUSH` or blocking commands.
* **Non-Idempotent Handlers:** Inserting a new ledger entry or booking confirmation on every retry, creating duplicate financial records.
* **Missing Error Re-throwing:** Catching an error without re-throwing it. BullMQ marks caught errors as "completed", masking failures.
* **Holding Long-Lived Transactions:** Keeping a Prisma transaction open while awaiting external calls to `FlutterwaveAdapter.verifyTransaction`.
* **Missing Graceful Shutdown:** Killing worker processes abruptly, leaving jobs stalled in the `active` state.

---

## Verify Before Done

1. [ ] Check that `ioredis` configuration sets `maxRetriesPerRequest: null`.
2. [ ] Verify that job handlers perform an idempotency check before modifying database state.
3. [ ] Verify that third-party HTTP calls occur outside database transactions.
4. [ ] Check that exponential backoff is configured for job retries.
5. [ ] **Write Tests:** Add worker tests in `apps/server/src/__tests__/workers/webhook.worker.test.ts` verifying:
   - Worker successfully processes valid unhandled job
   - Replay of duplicate job returns without creating duplicate bookings or ledger rows
   - Amount mismatch throws error and triggers retry
   - Graceful completion releases job from active state

