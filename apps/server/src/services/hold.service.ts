// apps/server/src/services/hold.service.ts
import crypto from 'crypto';
import { redisClient } from '../queues/connection';
import { writeClient, readClient } from '../repositories/client';
import { logger } from '../observability/logger';
import { HoldStatus, BookingSeatStatus, SeatType } from '@prisma/client';

export const HOLD_TTL_SECONDS = 600; // 10 minutes

export interface CreateHoldInput {
  showtimeId: string;
  seatIds: string[];
  userId: string;
  requestId?: string;
}

export interface HoldResult {
  holdToken: string;
  showtimeId: string;
  expiresAt: string;
  seatIds: string[];
}

export class ConflictError extends Error {
  public unavailableSeats: string[];
  constructor(message: string, unavailableSeats: string[]) {
    super(message);
    this.name = 'ConflictError';
    this.unavailableSeats = unavailableSeats;
  }
}

export class HoldService {
  /**
   * Redis key generator for a specific showtime seat hold.
   */
  private static getHoldKey(showtimeId: string, seatId: string): string {
    return `showtime:${showtimeId}:seat:${seatId}:hold`;
  }

  /**
   * Atomically acquires a multi-seat hold (all-or-nothing).
   */
  static async createHold(input: CreateHoldInput): Promise<HoldResult> {
    const { showtimeId, seatIds, userId, requestId } = input;

    // 1. Verify showtime exists and is open
    const showtime = await readClient.showtime.findUnique({
      where: { id: showtimeId },
      include: { auditorium: true },
    });

    if (!showtime) {
      throw new Error('Showtime not found');
    }

    if (showtime.status !== 'BOOKING_OPEN') {
      throw new Error('Bookings are closed for this showtime');
    }

    // 2. Check PostgreSQL durable allocations (confirmed bookings) - Primary writeClient for read-your-own-writes
    const confirmedSeats = await writeClient.bookingSeat.findMany({
      where: {
        showtimeId,
        seatId: { in: seatIds },
        status: BookingSeatStatus.CONFIRMED,
      },
      select: { seatId: true },
    });

    if (confirmedSeats.length > 0) {
      const unavailable = confirmedSeats.map((s) => s.seatId);
      logger.warn('Hold rejected: seats already booked in PostgreSQL', {
        showtimeId,
        unavailable,
        requestId,
      });
      throw new ConflictError('One or more selected seats are already booked', unavailable);
    }

    // 3. Check Redis / Database active holds
    const holdToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);
    const acquiredKeys: string[] = [];
    const unavailableSeats: string[] = [];

    const isRedisReady = redisClient.status === 'ready';

    if (isRedisReady) {
      // Phase 1: Fast Redis Gate
      for (const seatId of seatIds) {
        const key = this.getHoldKey(showtimeId, seatId);
        // SET key value NX EX 600
        const result = await redisClient.set(key, holdToken, 'EX', HOLD_TTL_SECONDS, 'NX');
        if (result === 'OK') {
          acquiredKeys.push(key);
        } else {
          unavailableSeats.push(seatId);
        }
      }

      // If any seat failed to acquire, roll back all acquired keys immediately
      if (unavailableSeats.length > 0) {
        for (const key of acquiredKeys) {
          // Compensating release: only delete if key equals holdToken
          const currentOwner = await redisClient.get(key);
          if (currentOwner === holdToken) {
            await redisClient.del(key);
          }
        }

        logger.warn('Hold rejected: seats currently held in Redis', {
          showtimeId,
          unavailableSeats,
          requestId,
        });
        throw new ConflictError('One or more selected seats are currently held by another user', unavailableSeats);
      }
    } else {
      // Fallback: Check active holds in PostgreSQL
      const activeDbHolds = await readClient.seatHold.findMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          status: HoldStatus.ACTIVE,
          expiresAt: { gte: new Date() },
        },
        select: { seatId: true },
      });

      if (activeDbHolds.length > 0) {
        const unavailable = activeDbHolds.map((h) => h.seatId);
        throw new ConflictError('One or more selected seats are currently held', unavailable);
      }
    }

    // 4. Record holds durably in PostgreSQL seat_holds table inside a transaction
    try {
      await writeClient.$transaction(
        seatIds.map((seatId) =>
          writeClient.seatHold.create({
            data: {
              holdToken,
              userId,
              showtimeId,
              seatId,
              expiresAt,
              status: HoldStatus.ACTIVE,
            },
          })
        )
      );
    } catch (err: any) {
      // Rollback Redis if DB write fails
      if (isRedisReady) {
        for (const key of acquiredKeys) {
          const currentOwner = await redisClient.get(key);
          if (currentOwner === holdToken) {
            await redisClient.del(key);
          }
        }
      }

      // If unique constraint violation on active seat hold:
      if (
        err?.code === 'P2002' ||
        String(err?.message).includes('uq_active_seat_hold') ||
        String(err?.message).includes('23505')
      ) {
        throw new ConflictError('One or more selected seats are currently held by another user', seatIds);
      }

      throw err;
    }

    logger.info('Multi-seat hold acquired successfully', {
      showtimeId,
      holdToken,
      seatCount: seatIds.length,
      userId,
      requestId,
    });

    return {
      holdToken,
      showtimeId,
      expiresAt: expiresAt.toISOString(),
      seatIds,
    };
  }

  /**
   * Releases a hold early if the user cancels or deselects.
   */
  static async releaseHold(showtimeId: string, holdToken: string, userId: string): Promise<boolean> {
    const isRedisReady = redisClient.status === 'ready';

    // 1. Find holds in DB
    const holds = await writeClient.seatHold.findMany({
      where: {
        showtimeId,
        holdToken,
        userId,
        status: HoldStatus.ACTIVE,
      },
    });

    if (holds.length === 0) {
      return false;
    }

    // 2. Release Redis keys
    if (isRedisReady) {
      for (const h of holds) {
        const key = this.getHoldKey(showtimeId, h.seatId);
        const current = await redisClient.get(key);
        if (current === holdToken) {
          await redisClient.del(key);
        }
      }
    }

    // 3. Mark DB records as RELEASED
    await writeClient.seatHold.updateMany({
      where: { showtimeId, holdToken, userId },
      data: { status: HoldStatus.RELEASED },
    });

    return true;
  }

  /**
   * Returns live seat status for a showtime (combining DB confirmed seats and active Redis holds).
   */
  static async getShowtimeSeatMap(showtimeId: string) {
    const showtime = await readClient.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        auditorium: {
          include: {
            seats: {
              orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        },
      },
    });

    if (!showtime) {
      throw new Error('Showtime not found');
    }

    const allSeats = showtime.auditorium.seats;

    // 1. Fetch confirmed allocations from PostgreSQL
    const confirmedSeats = await readClient.bookingSeat.findMany({
      where: {
        showtimeId,
        status: BookingSeatStatus.CONFIRMED,
      },
      select: { seatId: true },
    });
    const confirmedSet = new Set(confirmedSeats.map((s) => s.seatId));

    // 2. Fetch active holds from Redis (or DB fallback)
    const heldSet = new Set<string>();
    const isRedisReady = redisClient.status === 'ready';

    if (isRedisReady) {
      for (const s of allSeats) {
        if (!confirmedSet.has(s.id)) {
          const key = this.getHoldKey(showtimeId, s.id);
          const hold = await redisClient.get(key);
          if (hold) {
            heldSet.add(s.id);
          }
        }
      }
    } else {
      const dbHolds = await readClient.seatHold.findMany({
        where: {
          showtimeId,
          status: HoldStatus.ACTIVE,
          expiresAt: { gte: new Date() },
        },
        select: { seatId: true },
      });
      dbHolds.forEach((h) => heldSet.add(h.seatId));
    }

    // Map each seat with real-time status
    return {
      showtimeId: showtime.id,
      auditoriumName: showtime.auditorium.name,
      basePriceKobo: showtime.basePriceKobo,
      currency: showtime.currency,
      totalSeats: allSeats.length,
      seats: allSeats.map((seat) => {
        let status: 'AVAILABLE' | 'HELD' | 'SOLD' = 'AVAILABLE';
        if (confirmedSet.has(seat.id)) {
          status = 'SOLD';
        } else if (heldSet.has(seat.id)) {
          status = 'HELD';
        }

        return {
          id: seat.id,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          seatType: seat.seatType,
          status,
        };
      }),
    };
  }
}

