// apps/server/src/adapters/tmdb/types.ts
import { z } from 'zod';

// ==========================================
// External TMDB Raw Payloads (Defensive Zod)
// ==========================================

export const TmdbMovieRawSchema = z.object({
  id: z.number(),
  title: z.string().default('Untitled'),
  overview: z.string().default(''),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  release_date: z.string().default(''),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  genre_ids: z.array(z.number()).default([]),
  popularity: z.number().default(0),
  adult: z.boolean().default(false),
});

export const TmdbListResponseRawSchema = z.object({
  page: z.number().default(1),
  results: z.array(TmdbMovieRawSchema).default([]),
  total_pages: z.number().default(1),
  total_results: z.number().default(0),
});

export const TmdbMovieDetailRawSchema = TmdbMovieRawSchema.extend({
  runtime: z.number().nullable().optional(),
  tagline: z.string().nullable().optional(),
  genres: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      })
    )
    .default([]),
  status: z.string().default('Released'),
});

export type TmdbMovieRaw = z.infer<typeof TmdbMovieRawSchema>;
export type TmdbListResponseRaw = z.infer<typeof TmdbListResponseRawSchema>;
export type TmdbMovieDetailRaw = z.infer<typeof TmdbMovieDetailRawSchema>;

// ==========================================
// Internal Lead Row Movie DTOs
// ==========================================

export interface MovieDTO {
  id: string; // Database UUID if synced, or `tmdb-${tmdbId}`
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  voteAverage: number;
  voteCount: number;
  genres?: string[];
  tagline?: string | null;
}

export interface MovieListResponseDTO {
  page: number;
  totalPages: number;
  totalResults: number;
  movies: MovieDTO[];
  attribution: {
    notice: string;
    tmdbLogoUrl: string;
  };
}

