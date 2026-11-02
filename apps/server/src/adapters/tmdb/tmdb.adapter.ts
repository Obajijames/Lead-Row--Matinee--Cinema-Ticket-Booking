// apps/server/src/adapters/tmdb/tmdb.adapter.ts
import { logger } from '../../observability/logger';
import { MovieCache } from './cache';
import {
  TmdbListResponseRawSchema,
  TmdbMovieDetailRawSchema,
  MovieDTO,
  MovieListResponseDTO,
  TmdbMovieRaw,
  TmdbMovieDetailRaw,
} from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const TMDB_ATTRIBUTION = {
  notice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  tmdbLogoUrl: 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f4be30806d4127ad854cbd520ed4f100414261f1a67abed8363023a1.svg',
};

// Configurable TTLs in seconds (Rule 04)
const TTL_MOVIE_DETAILS = parseInt(process.env.TMDB_TTL_DETAILS || '86400', 10); // 24h
const TTL_CATALOGUE_LIST = parseInt(process.env.TMDB_TTL_LIST || '21600', 10); // 6h
const TTL_SEARCH_QUERY = parseInt(process.env.TMDB_TTL_SEARCH || '900', 10); // 15m

export class TmdbAdapter {
  private static getHeaders(): Record<string, string> {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY;

    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }

    if (apiKey) {
      return {
        'Content-Type': 'application/json',
      };
    }

    logger.warn('TMDB credentials missing: neither TMDB_READ_ACCESS_TOKEN nor TMDB_API_KEY configured');
    return {
      'Content-Type': 'application/json',
    };
  }

  private static buildUrl(endpoint: string, queryParams: Record<string, string | number> = {}): string {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    const apiKey = process.env.TMDB_API_KEY;
    const token = process.env.TMDB_READ_ACCESS_TOKEN;

    if (!token && apiKey) {
      url.searchParams.set('api_key', apiKey);
    }

    for (const [key, val] of Object.entries(queryParams)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    }

    return url.toString();
  }

  /**
   * Performs an HTTP GET with bounded retries, exponential backoff, jitter, and Retry-After support.
   */
  private static async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(url, {
          headers: this.getHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Honor TMDB 429 Rate Limits
        if (response.status === 429) {
          const retryAfterSec = parseInt(response.headers.get('Retry-After') || '1', 10);
          logger.warn(`TMDB rate limited (429). Waiting ${retryAfterSec}s before retry.`);
          await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
          continue;
        }

        if (response.ok || response.status < 500) {
          return response;
        }

        // Server error (5xx), trigger backoff
        throw new Error(`TMDB responded with HTTP ${response.status}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt >= maxRetries) {
          logger.error(`TMDB request failed after ${maxRetries} attempts`, { url, error: msg });
          throw err;
        }

        // Exponential backoff with random jitter: (100ms * 2^attempt) + jitter
        const jitter = Math.floor(Math.random() * 50);
        const backoffMs = 100 * Math.pow(2, attempt) + jitter;
        logger.warn(`TMDB request attempt ${attempt} failed. Retrying in ${backoffMs}ms...`, { error: msg });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error('TMDB request exceeded maximum retries');
  }

  // ==========================================
  // Public Catalog API Methods
  // ==========================================

  /**
   * Fetches now playing movies with Redis caching and stale fallback.
   * If region is omitted, 'GLOBAL', or 'ALL', fetches the worldwide catalog.
   */
  static async getNowPlaying(page = 1, region?: string): Promise<MovieListResponseDTO> {
    const regionParam =
      region && !['GLOBAL', 'ALL'].includes(region.toUpperCase())
        ? region.toUpperCase()
        : undefined;
    const regionKey = regionParam ? regionParam.toLowerCase() : 'global';
    const cacheKey = `tmdb:list:now_playing:${regionKey}:p${page}`;
    const cached = await MovieCache.get<MovieListResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const queryParams: Record<string, string | number> = { page };
      if (regionParam) {
        queryParams.region = regionParam;
      }
      const url = this.buildUrl('/movie/now_playing', queryParams);
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`TMDB error ${response.status}`);
      }

      const json = await response.json();
      const validated = TmdbListResponseRawSchema.parse(json);
      const dto = this.mapListResponse(validated);

      await MovieCache.set(cacheKey, dto, TTL_CATALOGUE_LIST);
      return dto;
    } catch (err: unknown) {
      const stale = MovieCache.getStale<MovieListResponseDTO>(cacheKey);
      if (stale) {
        logger.warn('Serving stale now_playing movie catalog due to upstream TMDB failure');
        return stale;
      }
      throw err;
    }
  }

  /**
   * Fetches upcoming movies with Redis caching and stale fallback.
   * If region is omitted, 'GLOBAL', or 'ALL', fetches the worldwide catalog.
   */
  static async getUpcoming(page = 1, region?: string): Promise<MovieListResponseDTO> {
    const regionParam =
      region && !['GLOBAL', 'ALL'].includes(region.toUpperCase())
        ? region.toUpperCase()
        : undefined;
    const regionKey = regionParam ? regionParam.toLowerCase() : 'global';
    const cacheKey = `tmdb:list:upcoming:${regionKey}:p${page}`;
    const cached = await MovieCache.get<MovieListResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const queryParams: Record<string, string | number> = { page };
      if (regionParam) {
        queryParams.region = regionParam;
      }
      const url = this.buildUrl('/movie/upcoming', queryParams);
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`TMDB error ${response.status}`);
      }

      const json = await response.json();
      const validated = TmdbListResponseRawSchema.parse(json);
      const dto = this.mapListResponse(validated);

      await MovieCache.set(cacheKey, dto, TTL_CATALOGUE_LIST);
      return dto;
    } catch (err: unknown) {
      const stale = MovieCache.getStale<MovieListResponseDTO>(cacheKey);
      if (stale) {
        logger.warn('Serving stale upcoming movie catalog due to upstream TMDB failure');
        return stale;
      }
      throw err;
    }
  }

  /**
   * Searches movies by keyword with Redis caching.
   */
  static async searchMovies(query: string, page = 1): Promise<MovieListResponseDTO> {
    const normalized = query.trim().toLowerCase();
    const cacheKey = `tmdb:search:${encodeURIComponent(normalized)}:p${page}`;
    const cached = await MovieCache.get<MovieListResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const url = this.buildUrl('/search/movie', { query: normalized, page });
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`TMDB error ${response.status}`);
      }

      const json = await response.json();
      const validated = TmdbListResponseRawSchema.parse(json);
      const dto = this.mapListResponse(validated);

      await MovieCache.set(cacheKey, dto, TTL_SEARCH_QUERY);
      return dto;
    } catch (err: unknown) {
      const stale = MovieCache.getStale<MovieListResponseDTO>(cacheKey);
      if (stale) {
        logger.warn('Serving stale movie search results due to upstream TMDB failure');
        return stale;
      }
      throw err;
    }
  }

  /**
   * Fetches single movie details by TMDB ID.
   */
  static async getMovieDetails(tmdbId: number): Promise<MovieDTO> {
    const cacheKey = `tmdb:movie:${tmdbId}`;
    const cached = await MovieCache.get<MovieDTO>(cacheKey);
    if (cached) return cached;

    try {
      const url = this.buildUrl(`/movie/${tmdbId}`);
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`TMDB error ${response.status}`);
      }

      const json = await response.json();
      const validated = TmdbMovieDetailRawSchema.parse(json);
      const dto = this.mapMovieDetail(validated);

      await MovieCache.set(cacheKey, dto, TTL_MOVIE_DETAILS);
      return dto;
    } catch (err: unknown) {
      const stale = MovieCache.getStale<MovieDTO>(cacheKey);
      if (stale) {
        logger.warn(`Serving stale movie details for TMDB ID ${tmdbId} due to upstream failure`);
        return stale;
      }
      throw err;
    }
  }

  // ==========================================
  // Internal DTO Mapping (Defensive isolation)
  // ==========================================

  private static mapListResponse(raw: {
    page: number;
    total_pages: number;
    total_results: number;
    results: TmdbMovieRaw[];
  }): MovieListResponseDTO {
    return {
      page: raw.page,
      totalPages: raw.total_pages,
      totalResults: raw.total_results,
      movies: raw.results.map((m) => this.mapRawMovie(m)),
      attribution: TMDB_ATTRIBUTION,
    };
  }

  private static mapRawMovie(raw: TmdbMovieRaw): MovieDTO {
    return {
      id: `tmdb-${raw.id}`,
      tmdbId: raw.id,
      title: raw.title || 'Untitled',
      overview: raw.overview || '',
      posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${raw.poster_path}` : null,
      backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w1280${raw.backdrop_path}` : null,
      releaseDate: raw.release_date || null,
      runtimeMinutes: null,
      voteAverage: Math.round(raw.vote_average * 10) / 10,
      voteCount: raw.vote_count,
    };
  }

  private static mapMovieDetail(raw: TmdbMovieDetailRaw): MovieDTO {
    return {
      id: `tmdb-${raw.id}`,
      tmdbId: raw.id,
      title: raw.title || 'Untitled',
      overview: raw.overview || '',
      posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${raw.poster_path}` : null,
      backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w1280${raw.backdrop_path}` : null,
      releaseDate: raw.release_date || null,
      runtimeMinutes: raw.runtime || null,
      voteAverage: Math.round(raw.vote_average * 10) / 10,
      voteCount: raw.vote_count,
      genres: raw.genres.map((g) => g.name),
      tagline: raw.tagline || null,
    };
  }
}

