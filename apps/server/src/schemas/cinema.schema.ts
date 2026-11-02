// apps/server/src/schemas/cinema.schema.ts
import { z } from 'zod';

export const CinemaQuerySchema = z.object({
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export type CinemaQuery = z.infer<typeof CinemaQuerySchema>;

