import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import movieRoutes from './routes/movie.routes';
import cinemaRoutes from './routes/cinema.routes';
import holdRoutes from './routes/hold.routes';
import bookingRoutes from './routes/booking.routes';
import { webhookRouter } from './routes/webhook.routes';

export function createApp(): Express {
  const app = express();

  // Edge Security & Tracing Middleware
  app.use(helmet());
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);

  // Healthcheck endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  });

  // REST API v1 Routes
  app.use('/v1/movies', movieRoutes);
  app.use('/v1/cinemas', cinemaRoutes);
  app.use('/v1/showtimes', holdRoutes);
  app.use('/v1/bookings', bookingRoutes);
  app.use('/v1/webhooks', webhookRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
