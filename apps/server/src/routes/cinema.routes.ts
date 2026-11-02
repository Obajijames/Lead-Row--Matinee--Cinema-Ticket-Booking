// apps/server/src/routes/cinema.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { readClient } from '../repositories/client';
import { validateRequest } from '../middleware/validateRequest';
import { CinemaQuerySchema, CinemaQuery } from '../schemas/cinema.schema';

const router: Router = Router();

/**
 * GET /v1/cinemas
 * Returns all active cinema locations with auditoriums and metadata.
 */
router.get(
  '/',
  validateRequest({ query: CinemaQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as CinemaQuery;

      const whereClause: any = { isActive: true };
      if (query.city) {
        whereClause.city = { contains: query.city, mode: 'insensitive' };
      }

      const cinemas = await readClient.cinema.findMany({
        where: whereClause,
        include: {
          auditoriums: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json({
        success: true,
        data: { cinemas },
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
