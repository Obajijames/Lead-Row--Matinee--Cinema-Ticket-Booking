// apps/server/src/services/movie.service.ts
import { readClient } from '../repositories/client';
import { TmdbAdapter } from '../adapters/tmdb/tmdb.adapter';
import { MovieDTO, MovieListResponseDTO } from '../adapters/tmdb/types';
import { ShowtimeStatus } from '@prisma/client';

export class MovieService {
  /**
   * Returns movies currently playing, enriched with active local database showtimes where available.
   * Region parameter allows filtering by country code (e.g. 'NG') or global worldwide catalog.
   */
  static async getNowPlaying(page = 1, region?: string): Promise<MovieListResponseDTO> {
    try {
      const tmdbResult = await TmdbAdapter.getNowPlaying(page, region);

      // Check local database for movies with active showtimes
      const dbMovies = await readClient.movie.findMany({
        where: {
          showtimes: {
            some: {
              status: ShowtimeStatus.BOOKING_OPEN,
              startTime: { gte: new Date() },
            },
          },
        },
        select: { id: true, tmdbId: true },
      });

      const dbMap = new Map(dbMovies.map((m) => [m.tmdbId, m.id]));

      // Enrich DTO with local database UUID if synced
      const enrichedMovies = tmdbResult.movies.map((m) => ({
        ...m,
        id: dbMap.get(m.tmdbId) || m.id,
        hasLocalShowtimes: dbMap.has(m.tmdbId),
      }));

      return {
        ...tmdbResult,
        movies: enrichedMovies,
      };
    } catch {
      // Fallback: If TMDB has no network or credentials, serve seeded movies from the local database
      const dbMovies = await readClient.movie.findMany({
        orderBy: { releaseDate: 'desc' },
      });

      const movies: MovieDTO[] = dbMovies.map((m) => ({
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        overview: m.overview,
        posterUrl: m.posterPath ? `https://image.tmdb.org/t/p/w500${m.posterPath}` : null,
        backdropUrl: m.backdropPath ? `https://image.tmdb.org/t/p/w1280${m.backdropPath}` : null,
        releaseDate: m.releaseDate ? m.releaseDate.toISOString().split('T')[0] : null,
        runtimeMinutes: m.runtime,
        voteAverage: m.voteAverage || 0,
        voteCount: 100,
      }));

      return {
        page: 1,
        totalPages: 1,
        totalResults: movies.length,
        movies,
        attribution: {
          notice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
          tmdbLogoUrl:
            'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f4be30806d4127ad854cbd520ed4f100414261f1a67abed8363023a1.svg',
        },
      };
    }
  }

  /**
   * Returns upcoming movies.
   * Region parameter allows filtering by country code (e.g. 'NG') or global worldwide catalog.
   */
  static async getUpcoming(page = 1, region?: string): Promise<MovieListResponseDTO> {
    try {
      return await TmdbAdapter.getUpcoming(page, region);
    } catch {
      return {
        page: 1,
        totalPages: 1,
        totalResults: 0,
        movies: [],
        attribution: {
          notice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
          tmdbLogoUrl:
            'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f4be30806d4127ad854cbd520ed4f100414261f1a67abed8363023a1.svg',
        },
      };
    }
  }

  /**
   * Searches movies by keyword.
   */
  static async searchMovies(query: string, page = 1): Promise<MovieListResponseDTO> {
    try {
      return await TmdbAdapter.searchMovies(query, page);
    } catch {
      // Local database title search fallback
      const dbMatches = await readClient.movie.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' },
        },
      });

      const movies: MovieDTO[] = dbMatches.map((m) => ({
        id: m.id,
        tmdbId: m.tmdbId,
        title: m.title,
        overview: m.overview,
        posterUrl: m.posterPath ? `https://image.tmdb.org/t/p/w500${m.posterPath}` : null,
        backdropUrl: m.backdropPath ? `https://image.tmdb.org/t/p/w1280${m.backdropPath}` : null,
        releaseDate: m.releaseDate ? m.releaseDate.toISOString().split('T')[0] : null,
        runtimeMinutes: m.runtime,
        voteAverage: m.voteAverage || 0,
        voteCount: 100,
      }));

      return {
        page: 1,
        totalPages: 1,
        totalResults: movies.length,
        movies,
        attribution: {
          notice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
          tmdbLogoUrl:
            'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f4be30806d4127ad854cbd520ed4f100414261f1a67abed8363023a1.svg',
        },
      };
    }
  }

  /**
   * Fetches full movie details and includes active showtimes.
   */
  static async getMovieDetails(identifier: string): Promise<MovieDTO & { showtimes?: unknown[] }> {
    // 1. Check if identifier is a UUID in our database
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

    let dbMovie = null;
    let tmdbId: number | null = null;

    if (isUuid) {
      dbMovie = await readClient.movie.findUnique({
        where: { id: identifier },
        include: {
          showtimes: {
            where: {
              status: ShowtimeStatus.BOOKING_OPEN,
              startTime: { gte: new Date() },
            },
            include: {
              auditorium: {
                include: { cinema: true },
              },
            },
            orderBy: { startTime: 'asc' },
          },
        },
      });

      if (dbMovie) {
        tmdbId = dbMovie.tmdbId;
      }
    } else {
      tmdbId = parseInt(identifier.replace('tmdb-', ''), 10);
      if (!isNaN(tmdbId)) {
        dbMovie = await readClient.movie.findUnique({
          where: { tmdbId },
          include: {
            showtimes: {
              where: {
                status: ShowtimeStatus.BOOKING_OPEN,
                startTime: { gte: new Date() },
              },
              include: {
                auditorium: {
                  include: { cinema: true },
                },
              },
              orderBy: { startTime: 'asc' },
            },
          },
        });
      }
    }

    // Try fetching from TMDB adapter
    if (tmdbId) {
      try {
        const tmdbDetails = await TmdbAdapter.getMovieDetails(tmdbId);
        return {
          ...tmdbDetails,
          id: dbMovie ? dbMovie.id : tmdbDetails.id,
          showtimes: dbMovie ? dbMovie.showtimes : [],
        };
      } catch {
        // If TMDB upstream fails, fallback to DB if present
        if (dbMovie) {
          return {
            id: dbMovie.id,
            tmdbId: dbMovie.tmdbId,
            title: dbMovie.title,
            overview: dbMovie.overview,
            posterUrl: dbMovie.posterPath ? `https://image.tmdb.org/t/p/w500${dbMovie.posterPath}` : null,
            backdropUrl: dbMovie.backdropPath ? `https://image.tmdb.org/t/p/w1280${dbMovie.backdropPath}` : null,
            releaseDate: dbMovie.releaseDate ? dbMovie.releaseDate.toISOString().split('T')[0] : null,
            runtimeMinutes: dbMovie.runtime,
            voteAverage: dbMovie.voteAverage || 0,
            voteCount: 100,
            showtimes: dbMovie.showtimes,
          };
        }
      }
    }

    if (dbMovie) {
      return {
        id: dbMovie.id,
        tmdbId: dbMovie.tmdbId,
        title: dbMovie.title,
        overview: dbMovie.overview,
        posterUrl: dbMovie.posterPath ? `https://image.tmdb.org/t/p/w500${dbMovie.posterPath}` : null,
        backdropUrl: dbMovie.backdropPath ? `https://image.tmdb.org/t/p/w1280${dbMovie.backdropPath}` : null,
        releaseDate: dbMovie.releaseDate ? dbMovie.releaseDate.toISOString().split('T')[0] : null,
        runtimeMinutes: dbMovie.runtime,
        voteAverage: dbMovie.voteAverage || 0,
        voteCount: 100,
        showtimes: dbMovie.showtimes,
      };
    }

    throw new Error('Movie not found');
  }

  /**
   * Fetches showtimes for a specific movie.
   */
  static async getMovieShowtimes(identifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

    let whereClause;
    if (isUuid) {
      whereClause = { movieId: identifier };
    } else {
      const tmdbId = parseInt(identifier.replace('tmdb-', ''), 10);
      whereClause = { movie: { tmdbId } };
    }

    return await readClient.showtime.findMany({
      where: {
        ...whereClause,
        status: ShowtimeStatus.BOOKING_OPEN,
        startTime: { gte: new Date() },
      },
      include: {
        auditorium: {
          include: { cinema: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Fetches distinct movies that currently have active, bookable upcoming showtimes.
   */
  static async getMoviesWithActiveShowtimes(dateFilter?: string): Promise<MovieListResponseDTO> {
    let startTimeFilter: any = { gte: new Date() };

    if (dateFilter) {
      const startOfDay = new Date(`${dateFilter}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateFilter}T23:59:59.999Z`);
      startTimeFilter = {
        gte: startOfDay > new Date() ? startOfDay : new Date(),
        lte: endOfDay,
      };
    }

    const showtimes = await readClient.showtime.findMany({
      where: {
        status: ShowtimeStatus.BOOKING_OPEN,
        startTime: startTimeFilter,
      },
      include: {
        movie: true,
        auditorium: {
          include: { cinema: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const movieMap = new Map<string, any>();
    for (const st of showtimes) {
      const showtimeEntry = {
        id: st.id,
        startTime: st.startTime.toISOString(),
        endTime: st.endTime.toISOString(),
        cinemaName: st.auditorium.cinema.name,
        auditoriumName: st.auditorium.name,
        basePriceKobo: st.basePriceKobo,
      };

      if (!movieMap.has(st.movieId)) {
        movieMap.set(st.movieId, {
          id: st.movie.id,
          tmdbId: st.movie.tmdbId,
          title: st.movie.title,
          overview: st.movie.overview,
          posterUrl: st.movie.posterPath ? `https://image.tmdb.org/t/p/w500${st.movie.posterPath}` : null,
          backdropUrl: st.movie.backdropPath ? `https://image.tmdb.org/t/p/w1280${st.movie.backdropPath}` : null,
          releaseDate: st.movie.releaseDate ? st.movie.releaseDate.toISOString().split('T')[0] : null,
          runtimeMinutes: st.movie.runtime,
          voteAverage: st.movie.voteAverage || 0,
          voteCount: 100,
          nextShowtime: st.startTime.toISOString(),
          cinemaName: st.auditorium.cinema.name,
          lowestPriceKobo: st.basePriceKobo,
          showtimes: [showtimeEntry],
        });
      } else {
        const existing = movieMap.get(st.movieId);
        existing.showtimes.push(showtimeEntry);
        if (st.basePriceKobo < existing.lowestPriceKobo) {
          existing.lowestPriceKobo = st.basePriceKobo;
        }
      }
    }

    const movies = Array.from(movieMap.values());
    return {
      page: 1,
      totalPages: 1,
      totalResults: movies.length,
      movies,
      attribution: {
        notice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
        tmdbLogoUrl:
          'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f4be30806d4127ad854cbd520ed4f100414261f1a67abed8363023a1.svg',
      },
    };
  }
}

