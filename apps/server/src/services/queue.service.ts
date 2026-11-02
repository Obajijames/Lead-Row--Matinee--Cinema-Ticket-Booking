// apps/server/src/services/queue.service.ts
import crypto from 'crypto';
import { writeClient, readClient } from '../repositories/client';
import { redisClient } from '../queues/connection';
import { logger } from '../observability/logger';

const ACTIVE_CAP = parseInt(process.env.WAITING_ROOM_ACTIVE_CAP || '50', 10);
const ADMISSION_RATE_PER_MIN = parseInt(process.env.WAITING_ROOM_ADMISSION_RATE_PER_MIN || '10', 10);
const ADMISSION_VALIDITY_SECONDS = 900; // 15 minutes

export interface QueueStatusResult {
  admitted: boolean;
  token?: string;
  expiresAt?: string;
  position?: number;
  estimatedWaitSeconds?: number;
  retryAfterSeconds?: number;
}

export class QueueService {
  /**
   * Enters the virtual waiting room for a high-demand showtime.
   * If under capacity, admits immediately; otherwise returns queue position and jittered retry guidance.
   */
  static async joinQueue(userId: string, showtimeId: string, requestId?: string): Promise<QueueStatusResult> {
    const now = new Date();

    // 1. Check if user already has an active, valid admission token
    const existingAdmission = await readClient.queueAdmission.findFirst({
      where: {
        userId,
        showtimeId,
        expiresAt: { gt: now },
      },
    });

    if (existingAdmission) {
      return {
        admitted: true,
        token: existingAdmission.token,
        expiresAt: existingAdmission.expiresAt.toISOString(),
      };
    }

    // 2. Count current active admissions for this showtime
    const currentActiveCount = await readClient.queueAdmission.count({
      where: {
        showtimeId,
        expiresAt: { gt: now },
      },
    });

    // 3. If under the active session cap, admit immediately
    if (currentActiveCount < ACTIVE_CAP) {
      const token = `adm_${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(now.getTime() + ADMISSION_VALIDITY_SECONDS * 1000);

      await writeClient.queueAdmission.create({
        data: {
          userId,
          showtimeId,
          token,
          expiresAt,
        },
      });

      logger.info('User admitted to showtime booking session', {
        userId,
        showtimeId,
        currentActiveCount: currentActiveCount + 1,
        requestId,
      });

      return {
        admitted: true,
        token,
        expiresAt: expiresAt.toISOString(),
      };
    }

    // 4. Over capacity: calculate queue position and estimated wait
    // We add user to waiting list
    const position = (currentActiveCount - ACTIVE_CAP) + 1;
    const estimatedWaitMinutes = position / (ADMISSION_RATE_PER_MIN || 1);
    const estimatedWaitSeconds = Math.max(10, Math.round(estimatedWaitMinutes * 60));

    // Controlled polling with jitter (Rule 10: avoid thundering herd / synchronized polling)
    const jitter = Math.floor(Math.random() * 5); // 0-4 seconds jitter
    const retryAfterSeconds = Math.min(30, Math.max(5, Math.round(estimatedWaitSeconds / 4))) + jitter;

    logger.info('User placed in virtual waiting room queue', {
      userId,
      showtimeId,
      position,
      estimatedWaitSeconds,
      retryAfterSeconds,
      requestId,
    });

    return {
      admitted: false,
      position,
      estimatedWaitSeconds,
      retryAfterSeconds,
    };
  }

  /**
   * Checks the status of a user's queue position or admission.
   */
  static async checkStatus(userId: string, showtimeId: string, requestId?: string): Promise<QueueStatusResult> {
    return this.joinQueue(userId, showtimeId, requestId);
  }

  /**
   * Verifies whether an admission token is valid and unexpired for the given showtime and user.
   */
  static async verifyAdmissionToken(token: string, showtimeId: string, userId: string): Promise<boolean> {
    const admission = await readClient.queueAdmission.findUnique({
      where: { token },
    });

    if (!admission) return false;
    if (admission.showtimeId !== showtimeId) return false;
    if (admission.userId !== userId) return false;
    if (admission.expiresAt <= new Date()) return false;

    return true;
  }
}

