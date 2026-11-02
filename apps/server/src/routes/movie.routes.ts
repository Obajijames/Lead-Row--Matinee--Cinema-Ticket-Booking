// apps/server/src/routes/movie.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  MovieListQuerySchema,
  MovieSearchQuerySchema,
  MovieParamSchema,
  MovieListQuery,
  MovieSearchQuery,
  MovieParam,
} from '../schemas/movie.schema';
import { MovieService } from '../services/movie.service';

const router: Router = Router();

/**
 * GET /v1/movies/now-playing
 * Returns currently playing movies.
 */
router.get(
  '/now-playing',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:movies:now-playing' }),
  validateRequest({ query: MovieListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as MovieListQuery;
      const result = await MovieService.getNowPlaying(query.page, query.region);

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
 * GET /v1/movies/upcoming
 * Returns upcoming releases.
 */
router.get(
  '/upcoming',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:movies:upcoming' }),
  validateRequest({ query: MovieListQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as MovieListQuery;
      const result = await MovieService.getUpcoming(query.page, query.region);

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
 * GET /v1/movies/search
 * Searches movies by title keyword.
 */
router.get(
  '/search',
  rateLimiter({ windowMs: 60000, max: 30, keyPrefix: 'rl:movies:search' }),
  validateRequest({ query: MovieSearchQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as MovieSearchQuery;
      const result = await MovieService.searchMovies(query.q, query.page);

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
 * GET /v1/movies/with-showtimes
 * Returns distinct movies that have active upcoming showtimes.
 */
router.get(
  '/with-showtimes',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:movies:with-showtimes' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await MovieService.getMoviesWithActiveShowtimes();

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
 * GET /v1/movies/:id
 * Fetches single movie details with showtimes.
 */
router.get(
  '/:id',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:movies:detail' }),
  validateRequest({ params: MovieParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as MovieParam;
      const result = await MovieService.getMovieDetails(id);

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
 * GET /v1/movies/:id/showtimes
 * Fetches active showtimes for a movie.
 */
router.get(
  '/:id/showtimes',
  rateLimiter({ windowMs: 60000, max: 60, keyPrefix: 'rl:movies:showtimes' }),
  validateRequest({ params: MovieParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as unknown as MovieParam;
      const result = await MovieService.getMovieShowtimes(id);

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
