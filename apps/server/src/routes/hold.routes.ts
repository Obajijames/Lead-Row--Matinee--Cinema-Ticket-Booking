// apps/server/src/routes/hold.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  CreateHoldParamsSchema,
  CreateHoldBodySchema,
  ReleaseHoldParamsSchema,
  ShowtimeParamSchema,
  CreateHoldParams,
  CreateHoldBody,
  ReleaseHoldParams,
  ShowtimeParam,
} from '../schemas/hold.schema';
import { HoldService, ConflictError } from '../services/hold.service';
import { QueueService } from '../services/queue.service';
import { readClient } from '../repositories/client';

const router: Router = Router();

/**
 * GET /v1/showtimes/:showtimeId/seats
 * Live seat-map availability (AVAILABLE, HELD, SOLD).
 */
router.get(
  '/:showtimeId/seats',
  rateLimiter({ windowMs: 60000, max: 120, keyPrefix: 'rl:seats' }),
  validateRequest({ params: ShowtimeParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { showtimeId } = req.params as unknown as ShowtimeParam;
      const result = await HoldService.getShowtimeSeatMap(showtimeId);

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
 * POST /v1/showtimes/:showtimeId/holds
 * Fast atomic multi-seat hold (10 min TTL).
 */
router.post(
  '/:showtimeId/holds',
  rateLimiter({ windowMs: 60000, max: 20, keyPrefix: 'rl:holds' }),
  validateRequest({
    params: CreateHoldParamsSchema,
    body: CreateHoldBodySchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { showtimeId } = req.params as unknown as CreateHoldParams;
      const { seatIds, userId: bodyUserId } = req.body as unknown as CreateHoldBody;

      // In production, userId is taken from verified JWT auth middleware.
      // For testing/open demo, fallback to seeded customer if unauthenticated.
      let userId = bodyUserId;
      if (!userId) {
        const defaultCustomer = await readClient.user.findFirst({
          where: { role: 'CUSTOMER' },
          select: { id: true },
        });
        userId = defaultCustomer ? defaultCustomer.id : '00000000-0000-0000-0000-000000000000';
      }

      const holdResult = await HoldService.createHold({
        showtimeId,
        seatIds,
        userId,
        requestId: req.id,
      });

      return res.status(201).json({
        success: true,
        data: holdResult,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: unknown) {
      if (err instanceof ConflictError) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SEAT_CONFLICT',
            message: err.message,
            unavailableSeats: err.unavailableSeats,
            requestId: req.id,
          },
        });
      }
      return next(err);
    }
  }
);

/**
 * DELETE /v1/showtimes/:showtimeId/holds/:holdToken
 * Early release of an active seat hold.
 */
router.delete(
  '/:showtimeId/holds/:holdToken',
  validateRequest({ params: ReleaseHoldParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { showtimeId, holdToken } = req.params as unknown as ReleaseHoldParams;
      const defaultCustomer = await readClient.user.findFirst({
        where: { role: 'CUSTOMER' },
        select: { id: true },
      });
      const userId = defaultCustomer ? defaultCustomer.id : '00000000-0000-0000-0000-000000000000';

      const released = await HoldService.releaseHold(showtimeId, holdToken, userId);

      return res.status(200).json({
        success: true,
        data: { released },
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
 * POST /v1/showtimes/:showtimeId/queue/join
 * Join the virtual waiting room for high-demand blockbuster showtimes.
 */
router.post(
  '/:showtimeId/queue/join',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:queue' }),
  validateRequest({ params: ShowtimeParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { showtimeId } = req.params as unknown as ShowtimeParam;
      const defaultCustomer = await readClient.user.findFirst({
        where: { role: 'CUSTOMER' },
        select: { id: true },
      });
      const userId = (req.body?.userId as string) || defaultCustomer?.id || '00000000-0000-0000-0000-000000000000';

      const result = await QueueService.joinQueue(userId, showtimeId, req.id);

      if (!result.admitted) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds || 10));
      }

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
 * GET /v1/showtimes/:showtimeId/queue/status
 * Poll position in virtual waiting room with jittered retry guidance.
 */
router.get(
  '/:showtimeId/queue/status',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:queue-poll' }),
  validateRequest({ params: ShowtimeParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { showtimeId } = req.params as unknown as ShowtimeParam;
      const defaultCustomer = await readClient.user.findFirst({
        where: { role: 'CUSTOMER' },
        select: { id: true },
      });
      const userId = (req.query?.userId as string) || defaultCustomer?.id || '00000000-0000-0000-0000-000000000000';

      const result = await QueueService.checkStatus(userId, showtimeId, req.id);

      if (!result.admitted) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds || 10));
      }

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

