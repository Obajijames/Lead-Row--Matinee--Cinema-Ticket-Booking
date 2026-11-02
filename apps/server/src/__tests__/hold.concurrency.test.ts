// apps/server/src/__tests__/hold.concurrency.test.ts
import request from 'supertest';
import { createApp } from '../app';
import { writeClient } from '../repositories/client';
import { BookingSeatStatus } from '@prisma/client';

const app = createApp();

describe('High-Concurrency Seat Holds & Allocation Gates', () => {
  let showtimeId: string;
  let testSeats: { id: string; rowLabel: string; seatNumber: number }[];
  let customerId: string;

  beforeAll(async () => {
    // 1. Fetch seeded showtime
    const showtime = await writeClient.showtime.findFirst({
      where: { status: 'BOOKING_OPEN' },
      include: {
        auditorium: {
          include: {
            seats: { take: 10, orderBy: { seatNumber: 'asc' } },
          },
        },
      },
    });

    expect(showtime).not.toBeNull();
    showtimeId = showtime!.id;
    testSeats = showtime!.auditorium.seats;

    // 2. Fetch test customer
    const customer = await writeClient.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    expect(customer).not.toBeNull();
    customerId = customer!.id;
  });

  beforeEach(async () => {
    // Clean holds and allocations before each test for fresh deterministic state
    await writeClient.ticket.deleteMany({ where: { booking: { showtimeId } } });
    await writeClient.ledgerEntry.deleteMany({});
    await writeClient.payment.deleteMany({ where: { booking: { showtimeId } } });
    await writeClient.bookingSeat.deleteMany({ where: { showtimeId } });
    await writeClient.booking.deleteMany({ where: { showtimeId } });
    await writeClient.seatHold.deleteMany({ where: { showtimeId } });
  });

  afterAll(async () => {
    await writeClient.$disconnect();
  });

  describe('GET /v1/showtimes/:showtimeId/seats', () => {
    it('should return live auditorium seat map with integer minor unit pricing', async () => {
      const res = await request(app).get(`/v1/showtimes/${showtimeId}/seats`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.showtimeId).toBe(showtimeId);
      expect(res.body.data.basePriceKobo).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.seats)).toBe(true);
      expect(res.body.data.seats[0].status).toBeDefined();
    });
  });

  describe('POST /v1/showtimes/:showtimeId/holds', () => {
    it('should successfully acquire an atomic 10-minute hold for available seats', async () => {
      const seatsToHold = [testSeats[0].id, testSeats[1].id];

      const res = await request(app)
        .post(`/v1/showtimes/${showtimeId}/holds`)
        .send({
          seatIds: seatsToHold,
          userId: customerId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.holdToken).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();
      expect(res.body.data.seatIds).toEqual(seatsToHold);
    });

    it('should reject a competing hold with 409 Conflict when seats are already held', async () => {
      // 1. Acquire initial hold on testSeats[0]
      await request(app)
        .post(`/v1/showtimes/${showtimeId}/holds`)
        .send({
          seatIds: [testSeats[0].id],
          userId: customerId,
        });

      // 2. Competing hold attempts to lock [testSeats[0], testSeats[2]]
      const res = await request(app)
        .post(`/v1/showtimes/${showtimeId}/holds`)
        .send({
          seatIds: [testSeats[0].id, testSeats[2].id],
          userId: customerId,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SEAT_CONFLICT');
      expect(res.body.error.unavailableSeats).toContain(testSeats[0].id);

      // Verify atomic all-or-nothing: testSeats[2] must NOT be locked
      const seatRes = await request(app).get(`/v1/showtimes/${showtimeId}/seats`);
      const seat2 = seatRes.body.data.seats.find((s: any) => s.id === testSeats[2].id);
      expect(seat2.status).toBe('AVAILABLE');
    });
  });

  describe('High-Concurrency Race Condition (10 Virtual Users competing simultaneously)', () => {
    it('should grant hold to exactly ONE user and reject the other 9 with HTTP 409', async () => {
      const targetSeatId = testSeats[4].id;
      const concurrentUsers = 10;

      // 10 concurrent requests fired at the exact same millisecond
      const holdRequests = Array.from({ length: concurrentUsers }).map(() =>
        request(app)
          .post(`/v1/showtimes/${showtimeId}/holds`)
          .send({
            seatIds: [targetSeatId],
            userId: customerId,
          })
      );

      const responses = await Promise.all(holdRequests);

      const successful = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      // Invariant: Exactly 1 succeeds, exactly 9 receive 409
      expect(successful.length).toBe(1);
      expect(conflicts.length).toBe(concurrentUsers - 1);

      // The 1 winner must have a valid hold token
      expect(successful[0].body.data.holdToken).toBeDefined();

      // All 9 conflicts must return structured error
      conflicts.forEach((r) => {
        expect(r.body.error.code).toBe('SEAT_CONFLICT');
        expect(r.body.error.unavailableSeats).toContain(targetSeatId);
      });
    });
  });

  describe('Database Partial Unique Constraint (PostgreSQL Safety Net)', () => {
    it('should physically prevent two active confirmed bookings for the same seat', async () => {
      const seatId = testSeats[6].id;

      // Clean any existing test allocation for this seat so test is idempotent
      await writeClient.bookingSeat.deleteMany({ where: { showtimeId, seatId } });

      // Create a test booking
      const booking = await writeClient.booking.create({
        data: {
          userId: customerId,
          showtimeId,
          idempotencyKey: `idemp-${Date.now()}`,
          subtotalKobo: 450000,
          serviceFeeKobo: 50000,
          totalAmountKobo: 500000,
          currency: 'NGN',
          status: 'CONFIRMED',
        },
      });

      // 1. Insert first confirmed seat allocation
      await writeClient.bookingSeat.create({
        data: {
          bookingId: booking.id,
          showtimeId,
          seatId,
          status: BookingSeatStatus.CONFIRMED,
        },
      });

      // 2. Attempt to insert second confirmed allocation for the SAME (showtime_id, seat_id)
      let duplicateError: any = null;
      try {
        await writeClient.bookingSeat.create({
          data: {
            bookingId: booking.id,
            showtimeId,
            seatId,
            status: BookingSeatStatus.CONFIRMED,
          },
        });
      } catch (err) {
        duplicateError = err;
      }

      // Must fail with Prisma unique constraint violation P2002
      expect(duplicateError).not.toBeNull();
      expect(duplicateError.code).toBe('P2002');
    });
  });
});

