// apps/server/src/schemas/hold.schema.ts
import { z } from 'zod';

export const CreateHoldParamsSchema = z.object({
  showtimeId: z.string().uuid('Invalid showtime ID'),
});

export const CreateHoldBodySchema = z
  .object({
    seatIds: z
      .array(z.string().uuid('Invalid seat ID'))
      .min(1, 'At least 1 seat must be selected')
      .max(10, 'Cannot hold more than 10 seats at once'),
    userId: z.string().uuid('Invalid user ID').optional(),
  })
  .strict();

export const ReleaseHoldParamsSchema = z.object({
  showtimeId: z.string().uuid('Invalid showtime ID'),
  holdToken: z.string().min(1, 'Hold token is required'),
});

export const ShowtimeParamSchema = z.object({
  showtimeId: z.string().uuid('Invalid showtime ID'),
});

export type CreateHoldParams = z.infer<typeof CreateHoldParamsSchema>;
export type CreateHoldBody = z.infer<typeof CreateHoldBodySchema>;
export type ReleaseHoldParams = z.infer<typeof ReleaseHoldParamsSchema>;
export type ShowtimeParam = z.infer<typeof ShowtimeParamSchema>;

