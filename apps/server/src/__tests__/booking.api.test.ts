// apps/server/src/__tests__/booking.api.test.ts
import request from 'supertest';
import { createApp } from '../app';
import { writeClient } from '../repositories/client';

const app = createApp();

describe('Booking & Checkout API (/v1/bookings)', () => {
  let showtimeId: string;
  let seatId: string;
  let customerId: string;
  let holdToken: string;

  beforeAll(async () => {
    // 1. Fetch showtime and seat
    const showtime = await writeClient.showtime.findFirst({
      where: { status: 'BOOKING_OPEN' },
      include: {
        auditorium: {
          include: {
            seats: { take: 5, orderBy: { seatNumber: 'asc' } },
          },
        },
      },
    });

    expect(showtime).not.toBeNull();
    showtimeId = showtime!.id;
    seatId = showtime!.auditorium.seats[3].id;

    // 2. Fetch customer
    const customer = await writeClient.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    expect(customer).not.toBeNull();
    customerId = customer!.id;
  });

  beforeEach(async () => {
    // Clean holds and allocations for test seat
    await writeClient.bookingSeat.deleteMany({ where: { showtimeId, seatId } });
    await writeClient.seatHold.deleteMany({ where: { showtimeId, seatId } });

    // Acquire fresh hold
    const holdRes = await request(app)
      .post(`/v1/showtimes/${showtimeId}/holds`)
      .send({
        seatIds: [seatId],
        userId: customerId,
      });

    expect(holdRes.status).toBe(201);
    holdToken = holdRes.body.data.holdToken;
  });

  afterAll(async () => {
    await writeClient.$disconnect();
  });

  it('should successfully create a pending checkout with accurate minor unit pricing', async () => {
    const idempotencyKey = `idemp-chk-${Date.now()}`;

    const res = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken,
        showtimeId,
        idempotencyKey,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingId).toBeDefined();
    expect(res.body.data.status).toBe('PENDING_PAYMENT');
    expect(res.body.data.serviceFeeKobo).toBe(50000); // ₦500.00
    expect(res.body.data.totalAmountKobo).toBe(res.body.data.subtotalKobo + 50000);
    expect(res.body.data.currency).toBe('NGN');
    expect(res.body.data.paymentUrl).toContain('flutterwave.com');
  });

  it('should be strictly idempotent: repeating checkout with same idempotencyKey returns identical booking', async () => {
    const idempotencyKey = `idemp-chk-${Date.now()}-2`;

    // First checkout
    const res1 = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken,
        showtimeId,
        idempotencyKey,
      });

    expect(res1.status).toBe(201);
    const bookingId1 = res1.body.data.bookingId;

    // Second checkout with identical idempotencyKey
    const res2 = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken,
        showtimeId,
        idempotencyKey,
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.bookingId).toBe(bookingId1);
    expect(res2.body.data.idempotencyKey).toBe(idempotencyKey);
  });

  it('should reject checkout when holdToken is invalid or expired', async () => {
    const res = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken: 'invalid-or-expired-token-1234',
        showtimeId,
        idempotencyKey: `idemp-err-${Date.now()}`,
      });

    expect(res.status).toBe(500); // Handled domain error
    expect(res.body.success).toBe(false);
  });

  it('should list bookings via GET /v1/bookings', async () => {
    const res = await request(app).get('/v1/bookings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

