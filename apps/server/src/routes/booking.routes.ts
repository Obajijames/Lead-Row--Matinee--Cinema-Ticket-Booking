// apps/server/src/routes/booking.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  CreateCheckoutBodySchema,
  BookingParamSchema,
  CancelBookingParamSchema,
  CancelBookingBodySchema,
  CancelShowtimeParamSchema,
  CancelShowtimeBodySchema,
  CreateCheckoutBody,
  BookingParam,
  CancelBookingParam,
  CancelBookingBody,
  CancelShowtimeParam,
  CancelShowtimeBody,
} from '../schemas/booking.schema';
import { BookingService } from '../services/booking.service';
import { readClient, writeClient } from '../repositories/client';

const router: Router = Router();

/**
 * GET /v1/bookings/payment-callback
 * Flutterwave hosted checkout redirect target.
 * Verifies transaction with Flutterwave, confirms booking, issues ticket, and forwards to app.
 */
router.get('/payment-callback', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || '';
    const txRef = (req.query.tx_ref as string) || '';
    const transactionId = (req.query.transaction_id as string) || '';

    if (!txRef) {
      return res.status(400).send('Missing transaction reference');
    }

    const payment = await writeClient.payment.findUnique({
      where: { providerRef: txRef },
      select: { bookingId: true },
    });

    if (!payment) {
      return res.status(404).send('Booking payment reference not found');
    }

    let isConfirmed = false;
    if (status === 'successful' || status === 'completed') {
      try {
        const verif = await BookingService.verifyAndConfirmPayment(payment.bookingId, transactionId, req.id);
        isConfirmed = verif.confirmed;
      } catch (e) {
        console.warn('Payment callback confirmation warning:', e);
      }
    }

    const bookingId = payment.bookingId;

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Payment ${isConfirmed ? 'Successful' : 'Processing'} - Lead Row</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0B0B10;
            color: #FFFFFF;
            text-align: center;
            padding: 24px 16px;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .container {
            max-width: 400px;
            width: 100%;
            background: #14141E;
            border: 1px solid #2D2D3B;
            border-radius: 20px;
            padding: 36px 24px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          }
          .badge {
            display: inline-block;
            width: 72px;
            height: 72px;
            line-height: 72px;
            border-radius: 36px;
            background: ${isConfirmed ? 'rgba(75,181,67,0.15)' : 'rgba(215,150,10,0.15)'};
            color: ${isConfirmed ? '#4BB543' : '#d7960a'};
            font-size: 36px;
            margin-bottom: 20px;
            border: 2px solid ${isConfirmed ? 'rgba(75,181,67,0.3)' : 'rgba(215,150,10,0.3)'};
          }
          h1 {
            font-size: 24px;
            font-weight: 800;
            margin: 0 0 12px;
            color: #FFFFFF;
          }
          p {
            font-size: 15px;
            color: #A0A0B0;
            line-height: 1.6;
            margin: 0 0 24px;
          }
          .instruction-box {
            background: rgba(215, 150, 10, 0.1);
            border: 1px solid rgba(215, 150, 10, 0.4);
            border-radius: 14px;
            padding: 18px 16px;
          }
          .instruction-title {
            color: #d7960a;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .instruction-text {
            color: #E2E2EC;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;
            margin: 0;
          }
          .highlight {
            color: #d7960a;
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">${isConfirmed ? '✓' : '⏱'}</div>
          <h1>${isConfirmed ? 'Congratulations! 🎉' : 'Payment Received'}</h1>
          <p>
            ${isConfirmed
              ? 'Your cinema tickets are booked and your seats are confirmed in the system.'
              : 'Your payment transaction was received and is currently being verified.'}
          </p>

          <div class="instruction-box">
            <div class="instruction-title">Next Step</div>
            <p class="instruction-text">
              Please tap the <span class="highlight">✕ (Close)</span> or <span class="highlight">Done</span> button at the top corner of this screen to return to Lead Row and view your admission ticket.
            </p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send('Error processing payment confirmation');
  }
});

/**
 * POST /v1/bookings/checkout
 * Converts an active hold into a pending booking and Flutterwave payment order.
 */
router.post(
  '/checkout',
  rateLimiter({ windowMs: 60000, max: 20, keyPrefix: 'rl:checkout' }),
  validateRequest({ body: CreateCheckoutBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        holdToken,
        showtimeId,
        idempotencyKey,
        customerEmail,
        customerName,
      } = req.body as unknown as CreateCheckoutBody;

      // In production, taken from JWT token
      const defaultCustomer = await readClient.user.findFirst({
        where: { role: 'CUSTOMER' },
        select: { id: true, email: true, fullName: true },
      });

      const userId = defaultCustomer ? defaultCustomer.id : '00000000-0000-0000-0000-000000000000';

      const checkout = await BookingService.createCheckout({
        holdToken,
        showtimeId,
        idempotencyKey,
        userId,
        customerEmail: customerEmail || defaultCustomer?.email,
        customerName: customerName || defaultCustomer?.fullName,
        requestId: req.id,
      });

      return res.status(201).json({
        success: true,
        data: checkout,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /v1/bookings/:id
 * Fetches order and ticket details.
 */
router.get(
  '/:id',
  validateRequest({ params: BookingParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as BookingParam;
      const booking = await BookingService.getBooking(id);

      return res.status(200).json({
        success: true,
        data: booking,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /v1/bookings/:id/verify-payment
 * Active verification with Flutterwave to confirm booking, issue ticket, and write ledger.
 */
router.post(
  '/:id/verify-payment',
  validateRequest({ params: BookingParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as BookingParam;
      const transactionId = req.body?.transactionId as string | number | undefined;

      const result = await BookingService.verifyAndConfirmPayment(id, transactionId, req.id);

      return res.status(200).json({
        success: true,
        data: result,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /v1/bookings/:id/cancel
 * Cancels a pending booking and immediately releases allocated seats.
 */
router.post(
  '/:id/cancel',
  validateRequest({ params: CancelBookingParamSchema, body: CancelBookingBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as CancelBookingParam;
      const body = req.body as unknown as CancelBookingBody;
      const result = await BookingService.cancelBooking(id, body?.reason, req.id);

      return res.status(200).json({
        success: true,
        data: result,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /v1/bookings/showtimes/:id/cancel
 * Cancels an entire showtime, issues Flutterwave refunds, updates seats, and logs append-only REFUND_ISSUED ledger entries.
 */
router.post(
  '/showtimes/:id/cancel',
  rateLimiter({ windowMs: 60000, max: 10, keyPrefix: 'rl:cancel-showtime' }),
  validateRequest({ params: CancelShowtimeParamSchema, body: CancelShowtimeBodySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as CancelShowtimeParam;
      const { reason } = req.body as unknown as CancelShowtimeBody;

      const result = await BookingService.cancelShowtimeAndRefund(id, reason, req.id);

      return res.status(200).json({
        success: true,
        data: result,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;

