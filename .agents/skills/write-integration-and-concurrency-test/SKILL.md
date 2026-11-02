---
name: write-integration-and-concurrency-test
description: Author, execute, and verify automated integration and race-condition concurrency tests for API endpoints, database transactions, and webhooks. Trigger words: test, integration test, concurrency test, race condition, Jest, supertest, duplicate booking, webhook test, Promise.all.
---

## Overview

This skill guides the construction of automated integration and concurrency tests to verify database constraints, transaction atomicity, and zero double-booking under race conditions.
**Governing Rules:** `02-inventory-and-concurrency.md`, `03-financial-and-payments.md`, `08-testing-and-observability.md`, and `AGENTS.md` Section 11.

---

## Ordered Procedure

1. **Configure Isolated Test Environment:**
   - Establish dedicated test database (`DATABASE_URL_TEST`) and Redis instance (`REDIS_URL_TEST`).
   - Run migrations before test suites: `dotenv -e .env.test -- prisma migrate deploy`.
   - Setup global hooks in `apps/server/src/__tests__/setup.ts` to clean up tables and flush test Redis namespaces between runs.

2. **Seed Isolated Showtime & Seat Inventory:**
   - Write a test helper `seedTestShowtime({ cinemaId, auditoriumId, seatCount })`.
   - Seed one test showtime and specific test seats (e.g., Seat A1, Seat A2).
   - Return clean IDs for test consumption.

3. **Construct Simultaneous Race Condition (Concurrency Test):**
   - Use `Promise.all` to fire parallel hold requests targeting the **exact same seat at the exact same millisecond**:
     ```typescript
     const [res1, res2] = await Promise.all([
       request(app).post('/v1/showtimes/:id/holds').send({ seatIds: [seatA1] }),
       request(app).post('/v1/showtimes/:id/holds').send({ seatIds: [seatA1] }),
     ]);
     ```
   - Assert that **exactly one** request succeeds with HTTP `201 Created`.
   - Assert that the competing request fails with HTTP `409 Conflict`.

4. **Verify Database Safety Net via Direct SQL:**
   - Query PostgreSQL directly using raw query or Prisma client:
     ```typescript
     const duplicates = await prisma.$queryRaw`
       SELECT showtime_id, seat_id, COUNT(*)
       FROM booking_seats
       WHERE status = 'CONFIRMED'
       GROUP BY showtime_id, seat_id
       HAVING COUNT(*) > 1;
     `;
     ```
   - Assert `expect(duplicates).toHaveLength(0)`.

5. **Test Webhook Signature Verification & Idempotency:**
   - Test with valid Flutterwave HMAC signature -> HTTP 200.
   - Test with invalid signature -> HTTP 401/403.
   - Dispatch identical webhook payload twice -> verify only 1 booking and 1 ledger entry are created.

---

## Code Skeleton

```typescript
// apps/server/src/__tests__/concurrency/hold-concurrency.test.ts
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../repositories/client';
import { redisClient } from '../../services/redis';
import { seedTestShowtimeWithSeats } from '../helpers/seed';

describe('Concurrency & Zero Double-Booking Integration Test', () => {
  let showtimeId: string;
  let seatA1Id: string;
  let user1Token: string;
  let user2Token: string;

  beforeEach(async () => {
    // Flush test Redis and clear database
    await redisClient.flushdb();
    await prisma.bookingSeat.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.seatHold.deleteMany();

    const seeded = await seedTestShowtimeWithSeats({ seatCount: 10 });
    showtimeId = seeded.showtimeId;
    seatA1Id = seeded.seatIds[0];
    user1Token = seeded.user1Token;
    user2Token = seeded.user2Token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redisClient.quit();
  });

  it('rejects concurrent attempts to hold the same seat simultaneously (1 winner, 1 conflict)', async () => {
    // Fire two simultaneous requests for Seat A1
    const [response1, response2] = await Promise.all([
      request(app)
        .post(`/v1/showtimes/${showtimeId}/holds`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ seatIds: [seatA1Id], admissionToken: 'valid-token' }),
      request(app)
        .post(`/v1/showtimes/${showtimeId}/holds`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ seatIds: [seatA1Id], admissionToken: 'valid-token' }),
    ]);

    const statuses = [response1.status, response2.status].sort();

    // Exactly one winner (201) and one rejected (409)
    expect(statuses).toEqual([201, 409]);

    const conflictResponse = response1.status === 409 ? response1 : response2;
    expect(conflictResponse.body.error.code).toBe('SEAT_ALREADY_HELD');
  });

  it('proves zero duplicate active allocations in PostgreSQL', async () => {
    const duplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT showtime_id, seat_id, COUNT(*)
      FROM booking_seats
      WHERE status = 'CONFIRMED'
      GROUP BY showtime_id, seat_id
      HAVING COUNT(*) > 1;
    `;

    expect(duplicates).toHaveLength(0);
  });
});
```

---

## Common Traps

* **Sequential Execution in Tests:** Using `await req1; await req2;` instead of `Promise.all([req1, req2])`. Sequential calls test normal flow, not concurrency race conditions.
* **Testing Only HTTP Statuses:** Assuming that because an endpoint returned 409, the database is safe. Always verify the database directly with raw SQL queries.
* **Shared State Across Test Runs:** Forgetting to flush Redis hold keys before each test, causing false positive conflicts from prior test runs.
* **Ignoring Webhook Signature Rejection:** Forgetting to test that an invalid webhook hash is immediately rejected before touching the database.

---

## Verify Before Done

1. [ ] Check that `Promise.all` fires truly concurrent requests against the same seat.
2. [ ] Verify that database queries check directly for duplicates (`HAVING COUNT(*) > 1`).
3. [ ] Verify that duplicate webhook replay does not create duplicate ledger records.
4. [ ] Check that test suites clean up Redis and database state after execution.
5. [ ] **Run Test Command:**
   ```bash
   pnpm test:integration
   ```
   Ensure 100% of concurrency and constraint test suites pass cleanly.

