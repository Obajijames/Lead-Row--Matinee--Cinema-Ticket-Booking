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
import { readClient } from '../repositories/client';

const router: Router = Router();

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

