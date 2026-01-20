/**
 * Express Application Entry Point
 * AI-Powered Resume & Job Matching Platform
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import prisma from './config/database';
import { connectRedis } from './config/redis';
import routes from './routes';
import { errorHandler, notFoundHandler, setupUnhandledRejectionHandler } from './middlewares/errorHandler';
import { morganStream } from './utils/logger';
import logger from './utils/logger';
import { startWorkers } from './jobs/workers';
import fs from 'fs';
import path from 'path';

// Initialize Express app
const app: Express = express();

// Setup unhandled rejection handler
setupUnhandledRejectionHandler();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.frontendUrl,
  credentials: true,
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', { stream: morganStream }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.resolve(config.upload.uploadDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create logs directory
const logsDir = path.resolve('./logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// API Routes
app.use(`/api/${config.apiVersion}`, routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AI Resume Analyzer API',
    version: '1.0.0',
    environment: config.env,
    documentation: `/api/${config.apiVersion}/docs`,
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal...');
  
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');

    // Connect to Redis (if enabled)
    if (config.features.enableRedis) {
      await connectRedis();
    }

    // Start background workers (if enabled)
    if (config.features.enableBullMQ) {
      startWorkers();
    }

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📍 Environment: ${config.env}`);
      logger.info(`📄 API Version: ${config.apiVersion}`);
      logger.info(`🔗 API URL: http://localhost:${config.port}/api/${config.apiVersion}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', { error });
    process.exit(1);
  }
};

startServer();

export default app;
