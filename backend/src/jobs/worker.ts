/**
 * Worker Entry Point
 * Standalone script to run BullMQ workers
 */

import { config } from '../config';
import logger from '../utils/logger';
import { startWorkers, stopWorkers } from './workers';

// Check if BullMQ is enabled
if (!config.features.enableBullMQ) {
  logger.error('BullMQ is disabled. Enable it in .env to run workers.');
  process.exit(1);
}

logger.info('Starting BullMQ workers...');
logger.info('Workers configuration:', {
  redisHost: config.redis.host,
  redisPort: config.redis.port,
  bullmqEnabled: config.features.enableBullMQ,
});

// Start workers
startWorkers();
logger.info('Workers started successfully. Waiting for jobs...');

// Keep the process running
const keepAlive = setInterval(() => {
  logger.debug('Workers heartbeat - still running');
}, 60000); // Log every minute

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down workers...');
  clearInterval(keepAlive);
  await stopWorkers();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
