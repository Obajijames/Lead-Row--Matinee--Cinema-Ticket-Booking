// apps/server/src/schemas/movie.schema.ts
import { z } from 'zod';

export const MovieListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be an integer >= 1' }),
  region: z.string().optional(),
});

export const MovieSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').max(100),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be an integer >= 1' }),
});

export const MovieParamSchema = z.object({
  id: z.string().min(1, 'Movie identifier is required'),
});

export type MovieListQuery = z.infer<typeof MovieListQuerySchema>;
export type MovieSearchQuery = z.infer<typeof MovieSearchQuerySchema>;
export type MovieParam = z.infer<typeof MovieParamSchema>;

