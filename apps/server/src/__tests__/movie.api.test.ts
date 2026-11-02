// apps/server/src/__tests__/movie.api.test.ts
import request from 'supertest';
import { createApp } from '../app';
import { writeClient } from '../repositories/client';

const app = createApp();

describe('Movie Catalog REST API (/v1/movies)', () => {
  afterAll(async () => {
    await writeClient.$disconnect();
  });

  describe('GET /health', () => {
    it('should return health status and request ID', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /v1/movies/now-playing', () => {
    it('should return a list of movies with standard envelope and attribution', async () => {
      const res = await request(app).get('/v1/movies/now-playing');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.movies)).toBe(true);
      expect(res.body.data.attribution).toBeDefined();
      expect(res.body.data.attribution.notice).toContain('TMDB');
      expect(res.body.meta.requestId).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /v1/movies/search', () => {
    it('should return 400 when search query "q" is missing', async () => {
      const res = await request(app).get('/v1/movies/search');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 with matching movies when query is provided', async () => {
      const res = await request(app).get('/v1/movies/search?q=Dune');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.movies)).toBe(true);
    });
  });

  describe('GET /v1/movies/:id', () => {
    it('should return movie details and active showtimes for a seeded movie', async () => {
      // Find a seeded movie
      const dbMovie = await writeClient.movie.findFirst();
      expect(dbMovie).not.toBeNull();

      const res = await request(app).get(`/v1/movies/${dbMovie!.id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(dbMovie!.title);
      expect(Array.isArray(res.body.data.showtimes)).toBe(true);
    });

    it('should return active showtimes via /:id/showtimes', async () => {
      const dbMovie = await writeClient.movie.findFirst();
      const res = await request(app).get(`/v1/movies/${dbMovie!.id}/showtimes`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

