/**
 * Prisma Client Singleton
 * Ensures a single database connection across the application
 * Prevents connection pool exhaustion in development with hot reloading
 */

import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import logger from '../utils/logger';

// Declare global type for prisma client in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client with logging configuration
const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log:
      config.env === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

  // Log queries in development (only first time)
  if (config.env === 'development') {
    client.$on('query' as never, (e: { query: string; duration: number }) => {
      if (e.duration > 100) { // Only log slow queries
        logger.debug(`Slow Query (${e.duration}ms): ${e.query.substring(0, 100)}...`);
      }
    });
  }

  // Always log errors
  client.$on('error' as never, (e: { message: string }) => {
    logger.error('Prisma Error:', { message: e.message });
  });

  return client;
};

// Use global variable in development to preserve connection during hot reloading
const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (config.env === 'development') {
  global.__prisma = prisma;
}

// Graceful shutdown - only register once
let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Disconnecting Prisma client...');
  await prisma.$disconnect();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default prisma;
