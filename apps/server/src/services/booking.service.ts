// apps/server/src/services/booking.service.ts
import crypto from 'crypto';
import { writeClient, readClient } from '../repositories/client';
import { logger } from '../observability/logger';
import {
  BookingStatus,
  BookingSeatStatus,
  ShowtimeStatus,
  PaymentStatus,
  HoldStatus,
  SeatType,
  LedgerType,
  TicketStatus,
} from '@prisma/client';
import { FlutterwaveAdapter } from '../adapters/flutterwave/flutterwave.adapter';
import { redisClient } from '../queues/connection';

export const SERVICE_FEE_KOBO = 50000; // ₦500.00 in NGN kobo minor units

export interface CreateCheckoutInput {
  holdToken: string;
  showtimeId: string;
  idempotencyKey: string;
  userId: string;
  customerEmail?: string;
  customerName?: string;
  requestId?: string;
}

export interface ConfirmPaidBookingInput {
  webhookEventId?: string;
  transactionId: string | number;
  txRef: string;
  amountKobo: number;
  currency: string;
  providerEventId: string;
  requestId?: string;
}

export class BookingService {
  /**
   * Idempotently creates a booking and payment order from an active hold.
   */
  static async createCheckout(input: CreateCheckoutInput) {
    const { holdToken, showtimeId, idempotencyKey, userId, customerEmail, customerName, requestId } = input;

    // 1. Idempotency Check: Return existing booking if idempotencyKey was already used
    const existingBooking = await readClient.booking.findUnique({
      where: { idempotencyKey },
      include: {
        payments: true,
        bookingSeats: { include: { seat: true } },
      },
    });

    if (existingBooking) {
      logger.info('Returning existing booking for idempotencyKey', {
        bookingId: existingBooking.id,
        idempotencyKey,
        requestId,
      });

      const activePayment = existingBooking.payments[0];
      return {
        bookingId: existingBooking.id,
        idempotencyKey: existingBooking.idempotencyKey,
        status: existingBooking.status,
        subtotalKobo: existingBooking.subtotalKobo,
        serviceFeeKobo: existingBooking.serviceFeeKobo,
        totalAmountKobo: existingBooking.totalAmountKobo,
        currency: existingBooking.currency,
        providerRef: activePayment ? activePayment.providerRef : null,
        paymentUrl: activePayment
          ? `https://checkout.flutterwave.com/v3/hosted/pay/${activePayment.providerRef}`
          : null,
      };
    }

    // 2. Validate holdToken in seat_holds
    const activeHolds = await readClient.seatHold.findMany({
      where: {
        holdToken,
        showtimeId,
        status: HoldStatus.ACTIVE,
        expiresAt: { gte: new Date() },
      },
      include: { seat: true },
    });

    if (activeHolds.length === 0) {
      logger.warn('Checkout failed: holdToken is invalid or expired', {
        holdToken,
        showtimeId,
        requestId,
      });
      throw new Error('Hold session has expired or is invalid. Please select your seats again.');
    }

    // 3. Fetch Showtime to calculate price authoritatively
    const showtime = await readClient.showtime.findUnique({
      where: { id: showtimeId },
      include: { movie: true },
    });

    if (!showtime) {
      throw new Error('Showtime not found');
    }

    // Authoritative pricing: never trust mobile client!
    let subtotalKobo = 0;
    for (const hold of activeHolds) {
      let seatPrice = showtime.basePriceKobo;
      if (hold.seat.seatType === SeatType.VIP) {
        // VIP seats cost 1.5x base price
        seatPrice = Math.round(showtime.basePriceKobo * 1.5);
      }
      subtotalKobo += seatPrice;
    }

    const serviceFeeKobo = SERVICE_FEE_KOBO;
    const totalAmountKobo = subtotalKobo + serviceFeeKobo;
    const providerRef = `FLW-LR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 4. Create Booking and Payment in a transaction
    const booking = await writeClient.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          showtimeId,
          idempotencyKey,
          subtotalKobo,
          serviceFeeKobo,
          totalAmountKobo,
          currency: showtime.currency,
          status: BookingStatus.PENDING_PAYMENT,
          bookingSeats: {
            create: activeHolds.map((h) => ({
              showtimeId,
              seatId: h.seatId,
              status: 'CONFIRMED', // Reserved for this booking
            })),
          },
          payments: {
            create: {
              provider: 'flutterwave',
              providerRef,
              expectedAmountKobo: totalAmountKobo,
              currency: showtime.currency,
              status: PaymentStatus.PENDING,
            },
          },
        },
      });

      // Mark holds as CONVERTED
      await tx.seatHold.updateMany({
        where: { holdToken, showtimeId },
        data: { status: HoldStatus.CONVERTED },
      });

      return newBooking;
    });

    logger.info('Booking checkout created successfully', {
      bookingId: booking.id,
      totalAmountKobo,
      providerRef,
      requestId,
    });

    // Initialize hosted payment with Flutterwave
    const baseUrl = process.env.API_BASE_URL || 'https://lead-row-cinema-ticket-booking-api.vercel.app';
    const redirectUrl = `${baseUrl}/v1/bookings/payment-callback`;
    let paymentUrl = `https://checkout.flutterwave.com/v3/hosted/pay/${providerRef}`;
    try {
      const flwResult = await FlutterwaveAdapter.initializePayment({
        txRef: providerRef,
        amountInKobo: totalAmountKobo,
        currency: showtime.currency,
        customerEmail: customerEmail || 'customer@leadrow.com',
        customerName: customerName || 'Lead Row Customer',
        redirectUrl,
      });
      paymentUrl = flwResult.paymentUrl;
    } catch (err: any) {
      logger.warn('Could not initialize Flutterwave payment link upstream', { error: err.message });
    }

    return {
      bookingId: booking.id,
      idempotencyKey: booking.idempotencyKey,
      status: booking.status,
      subtotalKobo,
      serviceFeeKobo,
      totalAmountKobo,
      currency: booking.currency,
      providerRef,
      paymentUrl,
    };
  }

  /**
   * Fetches booking by ID.
   */
  static async getBooking(bookingId: string) {
    const booking = await readClient.booking.findUnique({
      where: { id: bookingId },
      include: {
        showtime: {
          include: {
            movie: true,
            auditorium: { include: { cinema: true } },
          },
        },
        bookingSeats: { include: { seat: true } },
        payments: true,
        ticket: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    return {
      ...booking,
      bookingId: booking.id,
    };
  }

  /**
   * Persists incoming webhook receipt idempotently before asynchronous processing.
   */
  static async recordWebhookReceipt(params: {
    provider: string;
    providerEventId: string;
    rawPayload: any;
  }) {
    const { provider, providerEventId, rawPayload } = params;
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(rawPayload))
      .digest('hex');

    // Check for existing webhook event
    const existing = await writeClient.webhookEvent.findUnique({
      where: {
        uq_provider_event: {
          provider,
          providerEventId,
        },
      },
    });

    if (existing) {
      return { event: existing, isDuplicate: true };
    }

    const event = await writeClient.webhookEvent.create({
      data: {
        provider,
        providerEventId,
        payloadHash,
        isProcessed: false,
      },
    });

    return { event, isDuplicate: false };
  }

  /**
   * Checks whether a webhook event has already been successfully processed.
   */
  static async isWebhookProcessed(providerEventId: string): Promise<boolean> {
    const event = await readClient.webhookEvent.findFirst({
      where: { providerEventId, isProcessed: true },
    });
    return !!event;
  }

  /**
   * Confirms a paid booking, verifies minor unit amounts, writes append-only ledger entries,
   * and issues a cryptographically secure Ticket with QR payload.
   * Fully idempotent.
   */
  static async confirmPaidBooking(input: ConfirmPaidBookingInput) {
    const { webhookEventId, transactionId, txRef, amountKobo, currency, providerEventId, requestId } = input;

    // 1. Locate the Payment by providerRef
    const payment = await writeClient.payment.findUnique({
      where: { providerRef: txRef },
      include: {
        booking: {
          include: {
            bookingSeats: { include: { seat: true } },
            showtime: { include: { movie: true, auditorium: { include: { cinema: true } } } },
            ticket: true,
          },
        },
      },
    });

    if (!payment) {
      logger.error('Payment reference not found in database', { txRef, requestId });
      throw new Error(`Payment reference ${txRef} not found`);
    }

    const booking = payment.booking;

    // 2. Check if booking is already CONFIRMED
    if (booking.status === BookingStatus.CONFIRMED && booking.ticket) {
      logger.info('Booking is already confirmed and ticket issued (Idempotent)', {
        bookingId: booking.id,
        txRef,
        ticketId: booking.ticket.id,
      });

      if (webhookEventId) {
        await writeClient.webhookEvent.update({
          where: { id: webhookEventId },
          data: { isProcessed: true, processedAt: new Date() },
        });
      }

      return {
        bookingId: booking.id,
        status: booking.status,
        ticket: booking.ticket,
      };
    }

    // 3. Amount verification in integer minor units (kobo)
    if (payment.expectedAmountKobo !== amountKobo) {
      logger.error('Payment amount mismatch between expected and received', {
        bookingId: booking.id,
        expectedAmountKobo: payment.expectedAmountKobo,
        receivedAmountKobo: amountKobo,
        requestId,
      });
      throw new Error(
        `Payment amount mismatch: expected ${payment.expectedAmountKobo} kobo, received ${amountKobo} kobo`
      );
    }

    // 4. Currency verification
    if (payment.currency !== currency) {
      logger.error('Payment currency mismatch', {
        expected: payment.currency,
        received: currency,
        requestId,
      });
      throw new Error(`Payment currency mismatch: expected ${payment.currency}, received ${currency}`);
    }

    // 5. Execute confirmation, append-only ledger write, and ticket issuance in an ACID transaction
    const result = await writeClient.$transaction(async (tx) => {
      // Update Payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          verifiedAmountKobo: amountKobo,
        },
      });

      // Update Booking status
      const confirmedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
        },
      });

      // Append-Only Ledger Entry (Rule 02 & Rule 07)
      const ledgerEntry = await tx.ledgerEntry.upsert({
        where: {
          uq_ledger_source: {
            sourceType: 'FLUTTERWAVE_CHARGE',
            sourceReference: String(transactionId),
          },
        },
        create: {
          bookingId: booking.id,
          entryType: LedgerType.PAYMENT_RECEIVED,
          amountKobo,
          currency,
          sourceType: 'FLUTTERWAVE_CHARGE',
          sourceReference: String(transactionId),
          notes: `Confirmed payment via Flutterwave webhook for booking ${booking.id}`,
        },
        update: {}, // Idempotent: no modification if already exists
      });

      // Issue cryptographically secure Ticket
      const publicToken = crypto.randomBytes(16).toString('hex');
      const qrPayload = JSON.stringify({
        bookingId: booking.id,
        showtimeId: booking.showtimeId,
        movieTitle: booking.showtime.movie.title,
        cinemaName: booking.showtime.auditorium.cinema.name,
        auditoriumName: booking.showtime.auditorium.name,
        seats: booking.bookingSeats.map((bs) => `${bs.seat.rowLabel}${bs.seat.seatNumber}`),
        startTime: booking.showtime.startTime.toISOString(),
        publicToken,
        issuedAt: new Date().toISOString(),
      });

      const ticket = await tx.ticket.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          publicToken,
          qrPayload,
          status: TicketStatus.ISSUED,
        },
        update: {},
      });

      // Mark webhook event as processed
      if (webhookEventId) {
        await tx.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            isProcessed: true,
            processedAt: new Date(),
          },
        });
      }

      return { booking: confirmedBooking, ticket, ledgerEntry };
    });

    logger.info('Booking confirmed, ledger written, and ticket issued successfully', {
      bookingId: result.booking.id,
      ticketId: result.ticket.id,
      ledgerId: result.ledgerEntry.id,
      requestId,
    });

    return {
      bookingId: result.booking.id,
      status: result.booking.status,
      ticket: result.ticket,
    };
  }

  /**
   * Verifies payment with Flutterwave and confirms the booking immediately.
   * Can be invoked by the client returning from hosted checkout or the callback redirect.
   */
  static async verifyAndConfirmPayment(bookingId: string, transactionId?: string | number, requestId?: string) {
    const booking = await writeClient.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
        bookingSeats: { include: { seat: true } },
        showtime: { include: { movie: true, auditorium: { include: { cinema: true } } } },
        ticket: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CONFIRMED && booking.ticket) {
      return {
        confirmed: true,
        bookingId: booking.id,
        status: booking.status,
        ticket: booking.ticket,
      };
    }

    const payment = booking.payments[0];
    if (!payment) {
      throw new Error('No payment record associated with this booking');
    }

    // Check upstream Flutterwave verification
    let verifResult;
    if (transactionId) {
      verifResult = await FlutterwaveAdapter.verifyTransaction(transactionId);
    } else {
      verifResult = await FlutterwaveAdapter.verifyByTxRef(payment.providerRef);
    }

    if (verifResult.status !== 'successful') {
      logger.info('Payment verification status is not yet successful', {
        bookingId,
        status: verifResult.status,
        requestId,
      });
      return {
        confirmed: false,
        bookingId: booking.id,
        status: booking.status,
        paymentStatus: verifResult.status,
      };
    }

    // Call idempotent confirmation
    const confirmResult = await this.confirmPaidBooking({
      transactionId: transactionId || verifResult.flwRef || payment.providerRef,
      txRef: payment.providerRef,
      amountKobo: verifResult.amountInKobo || payment.expectedAmountKobo,
      currency: verifResult.currency || payment.currency,
      providerEventId: String(transactionId || payment.providerRef),
      requestId,
    });

    return {
      confirmed: true,
      bookingId: confirmResult.bookingId,
      status: confirmResult.status,
      ticket: confirmResult.ticket,
    };
  }

  /**
   * Explicitly cancels a pending or unpaid booking and releases held seats.
   */
  static async cancelBooking(bookingId: string, reason?: string, requestId?: string) {
    const booking = await readClient.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new Error('Cannot directly cancel a confirmed booking. Please use the refund process.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return { bookingId, status: booking.status, message: 'Booking already cancelled' };
    }

    await writeClient.$transaction(async (tx) => {
      // 1. Mark booking CANCELLED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // 2. Mark bookingSeats CANCELLED (releases partial unique index uq_active_seat_allocation)
      await tx.bookingSeat.updateMany({
        where: { bookingId },
        data: { status: BookingSeatStatus.CANCELLED },
      });

      // 3. Update pending payments to FAILED
      await tx.payment.updateMany({
        where: { bookingId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.FAILED },
      });
    });

    // 4. Clean up Redis hold keys
    try {
      const pipeline = redisClient.pipeline();
      for (const seat of booking.bookingSeats) {
        pipeline.del(`hold:${booking.showtimeId}:${seat.seatId}`);
      }
      await pipeline.exec();
    } catch (err: any) {
      logger.warn('Redis key cleanup failed during booking cancellation', { error: err.message, bookingId });
    }

    logger.info('Booking cancelled and seats released', { bookingId, reason, requestId });
    return { bookingId, status: BookingStatus.CANCELLED, releasedSeatsCount: booking.bookingSeats.length };
  }

  /**
   * Reconciles checkouts left in PENDING_PAYMENT status for longer than olderThanMinutes (default 15).
   * Releases booking seats so inventory is never held hostage by abandoned browser checkouts.
   */
  static async reconcileAbandonedCheckouts(olderThanMinutes = 15) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const abandonedBookings = await writeClient.booking.findMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        createdAt: { lt: cutoff },
      },
      include: {
        bookingSeats: true,
      },
      take: 100,
    });

    if (abandonedBookings.length === 0) {
      return { cancelledCount: 0 };
    }

    let cancelledCount = 0;
    for (const booking of abandonedBookings) {
      try {
        await writeClient.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CANCELLED },
          });

          await tx.bookingSeat.updateMany({
            where: { bookingId: booking.id },
            data: { status: BookingSeatStatus.CANCELLED },
          });

          await tx.payment.updateMany({
            where: { bookingId: booking.id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.FAILED },
          });
        });

        // Best effort Redis eviction
        try {
          const pipeline = redisClient.pipeline();
          for (const seat of booking.bookingSeats) {
            pipeline.del(`hold:${booking.showtimeId}:${seat.seatId}`);
          }
          await pipeline.exec();
        } catch {}

        cancelledCount++;
      } catch (err: any) {
        logger.error('Failed to cancel abandoned booking during reconciliation', {
          bookingId: booking.id,
          error: err.message,
        });
      }
    }

    logger.info('Abandoned checkout reconciliation sweep completed', { cancelledCount });
    return { cancelledCount };
  }

  /**
   * Cancels an entire showtime, processes refunds for all confirmed bookings via Flutterwave,
   * updates booking and seat allocations to CANCELLED, and logs append-only REFUND_ISSUED ledger entries.
   */
  static async cancelShowtimeAndRefund(showtimeId: string, reason: string, requestId?: string) {
    const showtime = await writeClient.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        auditorium: { include: { cinema: true } },
      },
    });

    if (!showtime) {
      throw new Error(`Showtime ${showtimeId} not found`);
    }

    if (showtime.status === ShowtimeStatus.CANCELLED) {
      throw new Error(`Showtime ${showtimeId} is already cancelled`);
    }

    // 1. Mark Showtime CANCELLED
    await writeClient.showtime.update({
      where: { id: showtimeId },
      data: { status: ShowtimeStatus.CANCELLED },
    });

    // 2. Locate all CONFIRMED bookings for this showtime
    const confirmedBookings = await writeClient.booking.findMany({
      where: {
        showtimeId,
        status: BookingStatus.CONFIRMED,
      },
      include: {
        payments: { where: { status: PaymentStatus.SUCCESSFUL } },
        bookingSeats: true,
        ticket: true,
      },
    });

    logger.info('Processing refunds for cancelled showtime', {
      showtimeId,
      bookingCount: confirmedBookings.length,
      reason,
      requestId,
    });

    const refundResults = [];
    let totalRefundedKobo = 0;

    for (const booking of confirmedBookings) {
      const successfulPayment = booking.payments[0];
      const transactionId = successfulPayment ? successfulPayment.providerRef : null;

      let refundStatus = 'successful';
      let refundRef = `REFUND-${booking.id}-${Date.now()}`;

      // Call Flutterwave refund adapter if transactionId is present
      if (transactionId) {
        try {
          const flwRefund = await FlutterwaveAdapter.refundTransaction({
            transactionId,
            amountInKobo: booking.totalAmountKobo,
            comments: `Showtime cancelled: ${reason}`,
          });
          if (flwRefund.refundId) {
            refundRef = flwRefund.refundId;
          }
        } catch (flwErr: any) {
          logger.error('Flutterwave refund call error', {
            bookingId: booking.id,
            error: flwErr.message,
          });
          refundStatus = 'failed';
        }
      }

      // ACID transaction: Update booking, seats, payments, ticket, and write append-only Ledger
      await writeClient.$transaction(async (tx) => {
        // Mark booking REFUNDED
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.REFUNDED },
        });

        // Mark seats CANCELLED so they are completely unallocated
        await tx.bookingSeat.updateMany({
          where: { bookingId: booking.id },
          data: { status: BookingSeatStatus.CANCELLED },
        });

        // Update payment status
        if (successfulPayment) {
          await tx.payment.update({
            where: { id: successfulPayment.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        }

        // Void issued ticket
        if (booking.ticket) {
          await tx.ticket.update({
            where: { id: booking.ticket.id },
            data: { status: TicketStatus.VOIDED },
          });
        }

        // Record append-only REFUND_ISSUED in the Ledger
        await tx.ledgerEntry.create({
          data: {
            bookingId: booking.id,
            entryType: LedgerType.REFUND_ISSUED,
            amountKobo: booking.totalAmountKobo,
            currency: booking.currency,
            sourceType: 'FLUTTERWAVE_REFUND',
            sourceReference: refundRef,
            notes: `Refund issued for cancelled showtime (${showtime.movie.title}). Reason: ${reason}`,
          },
        });
      });

      totalRefundedKobo += booking.totalAmountKobo;
      refundResults.push({
        bookingId: booking.id,
        amountKobo: booking.totalAmountKobo,
        refundRef,
        status: refundStatus,
      });
    }

    // 3. Cancel any lingering pending bookings
    await writeClient.booking.updateMany({
      where: {
        showtimeId,
        status: BookingStatus.PENDING_PAYMENT,
      },
      data: { status: BookingStatus.CANCELLED },
    });
    await writeClient.bookingSeat.updateMany({
      where: {
        showtimeId,
        status: BookingSeatStatus.CONFIRMED,
      },
      data: { status: BookingSeatStatus.CANCELLED },
    });

    // 4. Release all active seat holds for this showtime
    await writeClient.seatHold.updateMany({
      where: { showtimeId, status: HoldStatus.ACTIVE },
      data: { status: HoldStatus.RELEASED },
    });

    logger.info('Showtime cancelled and all refunds ledgered successfully', {
      showtimeId,
      refundedCount: refundResults.length,
      totalRefundedKobo,
      requestId,
    });

    return {
      showtimeId,
      status: ShowtimeStatus.CANCELLED,
      movieTitle: showtime.movie.title,
      refundedBookingsCount: refundResults.length,
      totalRefundedKobo,
      refunds: refundResults,
    };
  }
}
