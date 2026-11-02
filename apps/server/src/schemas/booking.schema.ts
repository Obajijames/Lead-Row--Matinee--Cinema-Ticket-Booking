// apps/server/src/schemas/booking.schema.ts
import { z } from 'zod';

export const CreateCheckoutBodySchema = z
  .object({
    holdToken: z.string().min(1, 'Hold token is required'),
    showtimeId: z.string().uuid('Invalid showtime ID'),
    idempotencyKey: z.string().min(1, 'Idempotency key is required'),
    customerEmail: z.string().email('Valid email is required').optional(),
    customerName: z.string().min(1).optional(),
  })
  .strict();

export const BookingParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
});

export const CancelBookingParamSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
});

export const CancelBookingBodySchema = z.object({
  reason: z.string().optional(),
});

export const CancelShowtimeParamSchema = z.object({
  id: z.string().uuid('Invalid showtime ID'),
});

export const CancelShowtimeBodySchema = z
  .object({
    reason: z.string().min(1, 'Reason for cancellation is required'),
  })
  .strict();

export type CreateCheckoutBody = z.infer<typeof CreateCheckoutBodySchema>;
export type BookingParam = z.infer<typeof BookingParamSchema>;
export type CancelBookingParam = z.infer<typeof CancelBookingParamSchema>;
export type CancelBookingBody = z.infer<typeof CancelBookingBodySchema>;
export type CancelShowtimeParam = z.infer<typeof CancelShowtimeParamSchema>;
export type CancelShowtimeBody = z.infer<typeof CancelShowtimeBodySchema>;

