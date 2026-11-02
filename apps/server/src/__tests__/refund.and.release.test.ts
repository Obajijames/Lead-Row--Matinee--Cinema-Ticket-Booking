// apps/server/src/__tests__/refund.and.release.test.ts
import request from 'supertest';
import { createApp } from '../app';
import { writeClient } from '../repositories/client';
import { BookingService } from '../services/booking.service';
import { LedgerType, BookingStatus, BookingSeatStatus, ShowtimeStatus } from '@prisma/client';

const app = createApp();

describe('Checkout Release & Showtime Refund System', () => {
  let showtimeId: string;
  let seatId: string;
  let customerId: string;

  beforeAll(async () => {
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
    seatId = showtime!.auditorium.seats[1].id;

    const customer = await writeClient.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    expect(customer).not.toBeNull();
    customerId = customer!.id;
  });

  afterAll(async () => {
    await writeClient.$disconnect();
  });

  it('should release held seats when client abandons/cancels checkout via POST /v1/bookings/:id/cancel', async () => {
    // 1. Acquire hold
    const holdRes = await request(app)
      .post(`/v1/showtimes/${showtimeId}/holds`)
      .send({ seatIds: [seatId], userId: customerId });
    expect(holdRes.status).toBe(201);
    const holdToken = holdRes.body.data.holdToken;

    // 2. Create pending checkout
    const checkoutRes = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken,
        showtimeId,
        idempotencyKey: `idemp-cancel-${Date.now()}`,
      });
    expect(checkoutRes.status).toBe(201);
    const bookingId = checkoutRes.body.data.bookingId;

    // Verify seat is currently allocated
    const initialSeat = await writeClient.bookingSeat.findFirst({
      where: { bookingId, seatId },
    });
    expect(initialSeat?.status).toBe('CONFIRMED');

    // 3. User abandons/cancels checkout
    const cancelRes = await request(app)
      .post(`/v1/bookings/${bookingId}/cancel`)
      .send({ reason: 'User closed payment modal' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // 4. Verify seat allocation is marked CANCELLED and freed
    const freedSeat = await writeClient.bookingSeat.findFirst({
      where: { bookingId, seatId },
    });
    expect(freedSeat?.status).toBe('CANCELLED');
  });

  it('should auto-release seats when reconcileAbandonedCheckouts sweeps stale PENDING_PAYMENT orders', async () => {
    // 1. Acquire hold
    const holdRes = await request(app)
      .post(`/v1/showtimes/${showtimeId}/holds`)
      .send({ seatIds: [seatId], userId: customerId });
    expect(holdRes.status).toBe(201);
    const holdToken = holdRes.body.data.holdToken;

    // 2. Create pending checkout
    const checkoutRes = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken,
        showtimeId,
        idempotencyKey: `idemp-sweep-${Date.now()}`,
      });
    expect(checkoutRes.status).toBe(201);
    const bookingId = checkoutRes.body.data.bookingId;

    // Artificially backdate the booking creation time to simulate abandonment (> 20 mins ago)
    await writeClient.booking.update({
      where: { id: bookingId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 1000) },
    });

    // 3. Trigger reconciliation
    const sweepResult = await BookingService.reconcileAbandonedCheckouts(15);
    expect(sweepResult.cancelledCount).toBeGreaterThanOrEqual(1);

    // 4. Verify booking and seats are CANCELLED
    const sweptBooking = await writeClient.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSeats: true },
    });
    expect(sweptBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(sweptBooking?.bookingSeats[0].status).toBe(BookingSeatStatus.CANCELLED);
  });

  it('should cancel showtime, refund confirmed bookings, and record REFUND_ISSUED in append-only ledger', async () => {
    // 1. Create a dedicated showtime for this cancellation test
    const movie = await writeClient.movie.findFirst();
    const auditorium = await writeClient.auditorium.findFirst({
      include: { seats: { take: 2 } },
    });
    expect(movie).not.toBeNull();
    expect(auditorium).not.toBeNull();

    const testShowtime = await writeClient.showtime.create({
      data: {
        movieId: movie!.id,
        auditoriumId: auditorium!.id,
        startTime: new Date(Date.now() + 3600000 * 48),
        endTime: new Date(Date.now() + 3600000 * 50),
        basePriceKobo: 500000,
        currency: 'NGN',
        status: ShowtimeStatus.BOOKING_OPEN,
      },
    });

    const testSeat = auditorium!.seats[0];

    // 2. Create a confirmed booking with a ticket
    const txRef = `FLW-TEST-CANCEL-${Date.now()}`;
    const confirmedBooking = await writeClient.booking.create({
      data: {
        userId: customerId,
        showtimeId: testShowtime.id,
        idempotencyKey: `idemp-showtime-cancel-${Date.now()}`,
        subtotalKobo: 500000,
        serviceFeeKobo: 50000,
        totalAmountKobo: 550000,
        currency: 'NGN',
        status: BookingStatus.CONFIRMED,
        bookingSeats: {
          create: [{ showtimeId: testShowtime.id, seatId: testSeat.id, status: 'CONFIRMED' }],
        },
        payments: {
          create: {
            provider: 'flutterwave',
            providerRef: txRef,
            expectedAmountKobo: 550000,
            verifiedAmountKobo: 550000,
            currency: 'NGN',
            status: 'SUCCESSFUL',
          },
        },
        ticket: {
          create: {
            publicToken: `token-${Date.now()}`,
            qrPayload: JSON.stringify({ valid: true }),
            status: 'ISSUED',
          },
        },
      },
    });

    // 3. Cancel the showtime via admin endpoint
    const cancelRes = await request(app)
      .post(`/v1/bookings/showtimes/${testShowtime.id}/cancel`)
      .send({ reason: 'Projector hardware failure in Auditorium 1' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.refundedBookingsCount).toBe(1);
    expect(cancelRes.body.data.totalRefundedKobo).toBe(550000);

    // 4. Verify database state
    // Showtime is CANCELLED
    const updatedShowtime = await writeClient.showtime.findUnique({
      where: { id: testShowtime.id },
    });
    expect(updatedShowtime?.status).toBe(ShowtimeStatus.CANCELLED);

    // Booking is REFUNDED
    const updatedBooking = await writeClient.booking.findUnique({
      where: { id: confirmedBooking.id },
      include: { bookingSeats: true, ticket: true },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.REFUNDED);
    expect(updatedBooking?.bookingSeats[0].status).toBe(BookingSeatStatus.CANCELLED);
    expect(updatedBooking?.ticket?.status).toBe('VOIDED');

    // Append-only LedgerEntry exists with entryType REFUND_ISSUED
    const ledger = await writeClient.ledgerEntry.findFirst({
      where: {
        bookingId: confirmedBooking.id,
        entryType: LedgerType.REFUND_ISSUED,
      },
    });
    expect(ledger).not.toBeNull();
    expect(ledger?.amountKobo).toBe(550000);
    expect(ledger?.sourceType).toBe('FLUTTERWAVE_REFUND');
    expect(ledger?.notes).toContain('Projector hardware failure');
  });
});

