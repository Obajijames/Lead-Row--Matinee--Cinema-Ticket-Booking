import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { createApp } from './app';
import { logger } from './observability/logger';
import { redisConnection, redisClient } from './queues/connection';
import { writeClient, readClient } from './repositories/client';
import { webhookWorker } from './workers/webhook.worker';
import { holdReconciliationWorker } from './workers/hold-reconciliation.worker';
import { scheduleHoldReconciliation, holdReconciliationQueue } from './queues/hold-reconciliation.queue';
import { webhookQueue } from './queues/webhook.queue';

const port = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(port, async () => {
  logger.info(`🎬 Lead Row API server running on port ${port}`, {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
  });

  // Schedule periodic hold reconciliation
  try {
    await scheduleHoldReconciliation();
  } catch (err: any) {
    logger.warn('Failed to initialize periodic hold scheduler', { error: err.message });
  }
});

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully shutting down server...`);
  server.close(async () => {
    try {
      const cleanups: Promise<any>[] = [];
      if (webhookWorker) cleanups.push(webhookWorker.close());
      if (holdReconciliationWorker) cleanups.push(holdReconciliationWorker.close());
      if (webhookQueue) cleanups.push(webhookQueue.close());
      if (holdReconciliationQueue) cleanups.push(holdReconciliationQueue.close());
      cleanups.push(redisConnection.quit().catch(() => {}));
      cleanups.push(redisClient.quit().catch(() => {}));
      cleanups.push(writeClient.$disconnect().catch(() => {}));
      cleanups.push(readClient.$disconnect().catch(() => {}));

      await Promise.all(cleanups);
      logger.info('Cleaned up all workers, queues, database and Redis connections. Exiting process.');
      process.exit(0);
    } catch (err: any) {
      logger.error('Error during graceful shutdown', { error: err.message });
      process.exit(1);
    }
  });
}

process.on('unhandledRejection', (reason) => {
  logger.warn('Unhandled promise rejection caught', { error: String(reason) });
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
