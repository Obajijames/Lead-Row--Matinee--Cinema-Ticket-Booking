// apps/server/src/__tests__/webhook.integration.test.ts
import request from 'supertest';
import { createApp } from '../app';
import { writeClient } from '../repositories/client';
import { BookingService } from '../services/booking.service';
import { FlutterwaveAdapter } from '../adapters/flutterwave/flutterwave.adapter';

const app = createApp();
const TEST_WEBHOOK_SECRET = 'flw_test_secret_hash_12345';

describe('Flutterwave Webhook & Ledger Engine Integration Test', () => {
  let showtimeId: string;
  let seatId: string;
  let customerId: string;
  let holdToken: string;
  let bookingId: string;
  let providerRef: string;
  let totalAmountKobo: number;

  beforeAll(async () => {
    process.env.FLUTTERWAVE_WEBHOOK_HASH = TEST_WEBHOOK_SECRET;

    // 1. Fetch open showtime and available seat
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
    seatId = showtime!.auditorium.seats[4].id;

    const customer = await writeClient.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    expect(customer).not.toBeNull();
    customerId = customer!.id;
  });

  beforeEach(async () => {
    // Clean holds and allocations
    await writeClient.ticket.deleteMany({ where: { booking: { showtimeId } } });
    await writeClient.ledgerEntry.deleteMany({});
    await writeClient.bookingSeat.deleteMany({ where: { showtimeId, seatId } });
    await writeClient.seatHold.deleteMany({ where: { showtimeId, seatId } });
    await writeClient.webhookEvent.deleteMany({});

    // 1. Create Hold
    const holdRes = await request(app)
      .post(`/v1/showtimes/${showtimeId}/holds`)
      .send({
        seatIds: [seatId],
        userId: customerId,
      });

    expect(holdRes.status).toBe(201);
    holdToken = holdRes.body.data.holdToken;

    // 2. Create Checkout
    const checkoutRes = await request(app)
      .post('/v1/bookings/checkout')
      .send({
        holdToken,
        showtimeId,
        idempotencyKey: `idemp-wh-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });

    expect(checkoutRes.status).toBe(201);
    bookingId = checkoutRes.body.data.bookingId;
    providerRef = checkoutRes.body.data.providerRef;
    totalAmountKobo = checkoutRes.body.data.totalAmountKobo;
  });

  afterAll(async () => {
    await writeClient.$disconnect();
  });

  it('rejects webhook requests with missing or invalid signature header', async () => {
    const payload = {
      event: 'charge.completed',
      data: {
        id: 999901,
        tx_ref: providerRef,
        amount: totalAmountKobo / 100,
        currency: 'NGN',
        status: 'successful',
      },
    };

    // Missing signature
    const resNoSig = await request(app)
      .post('/v1/webhooks/flutterwave')
      .send(payload);

    expect(resNoSig.status).toBe(401);
    expect(resNoSig.body.error.code).toBe('UNAUTHORIZED_WEBHOOK');

    // Invalid signature
    const resBadSig = await request(app)
      .post('/v1/webhooks/flutterwave')
      .set('verif-hash', 'wrong_hash')
      .send(payload);

    expect(resBadSig.status).toBe(401);
    expect(resBadSig.body.error.code).toBe('UNAUTHORIZED_WEBHOOK');
  });

  it('accepts valid webhook signature and records webhook event receipt', async () => {
    const payload = {
      event: 'charge.completed',
      data: {
        id: 999902,
        tx_ref: providerRef,
        amount: totalAmountKobo / 100,
        currency: 'NGN',
        status: 'successful',
        customer: {
          email: 'test@leadrow.com',
          name: 'Lead Row User',
        },
      },
    };

    const res = await request(app)
      .post('/v1/webhooks/flutterwave')
      .set('verif-hash', TEST_WEBHOOK_SECRET)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.eventId).toBeDefined();

    // Verify webhook event was recorded in DB
    const recorded = await writeClient.webhookEvent.findUnique({
      where: { id: res.body.eventId },
    });
    expect(recorded).not.toBeNull();
    expect(recorded?.providerEventId).toBe('999902');
  });

  it('durably confirms booking, creates ledger entry, and issues ticket with QR code payload', async () => {
    const transactionId = 999903;

    // Directly execute booking confirmation service (as executed by the worker)
    const result = await BookingService.confirmPaidBooking({
      transactionId,
      txRef: providerRef,
      amountKobo: totalAmountKobo,
      currency: 'NGN',
      providerEventId: String(transactionId),
    });

    expect(result.bookingId).toBe(bookingId);
    expect(result.status).toBe('CONFIRMED');
    expect(result.ticket).toBeDefined();
    expect(result.ticket.publicToken).toBeDefined();
    expect(result.ticket.qrPayload).toContain(bookingId);

    // Verify durable database state
    const confirmedBooking = await writeClient.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
        ticket: true,
        ledgerEntries: true,
      },
    });

    expect(confirmedBooking?.status).toBe('CONFIRMED');
    expect(confirmedBooking?.payments[0].status).toBe('SUCCESSFUL');
    expect(confirmedBooking?.payments[0].verifiedAmountKobo).toBe(totalAmountKobo);

    // Verify append-only ledger entry (Rule 02 & Rule 07)
    expect(confirmedBooking?.ledgerEntries).toHaveLength(1);
    const ledger = confirmedBooking?.ledgerEntries[0];
    expect(ledger?.entryType).toBe('PAYMENT_RECEIVED');
    expect(ledger?.amountKobo).toBe(totalAmountKobo);
    expect(ledger?.currency).toBe('NGN');
    expect(ledger?.sourceType).toBe('FLUTTERWAVE_CHARGE');
    expect(ledger?.sourceReference).toBe(String(transactionId));
  });

  it('guarantees idempotency: re-running confirmation does not duplicate tickets or ledger entries', async () => {
    const transactionId = 999904;

    // First confirmation
    const res1 = await BookingService.confirmPaidBooking({
      transactionId,
      txRef: providerRef,
      amountKobo: totalAmountKobo,
      currency: 'NGN',
      providerEventId: String(transactionId),
    });

    // Replay confirmation (e.g. duplicate webhook or retry)
    const res2 = await BookingService.confirmPaidBooking({
      transactionId,
      txRef: providerRef,
      amountKobo: totalAmountKobo,
      currency: 'NGN',
      providerEventId: String(transactionId),
    });

    expect(res2.bookingId).toBe(res1.bookingId);
    expect(res2.ticket.id).toBe(res1.ticket.id);

    // Assert strictly 1 ticket and 1 ledger entry in DB
    const tickets = await writeClient.ticket.findMany({ where: { bookingId } });
    expect(tickets).toHaveLength(1);

    const ledgerEntries = await writeClient.ledgerEntry.findMany({ where: { bookingId } });
    expect(ledgerEntries).toHaveLength(1);
  });

  it('rejects confirmation if payment amount does not match expected minor unit price', async () => {
    const transactionId = 999905;
    const incorrectAmountKobo = totalAmountKobo - 10000; // ₦100 less

    await expect(
      BookingService.confirmPaidBooking({
        transactionId,
        txRef: providerRef,
        amountKobo: incorrectAmountKobo,
        currency: 'NGN',
        providerEventId: String(transactionId),
      })
    ).rejects.toThrow(/Payment amount mismatch/);

    // Confirm booking status remains PENDING_PAYMENT
    const booking = await writeClient.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.status).toBe('PENDING_PAYMENT');
  });
});

