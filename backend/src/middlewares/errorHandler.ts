/**
 * Error Handler Middleware
 * Centralized error handling for the application
 * Converts errors to standardized JSON responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError, isOperationalError } from '../utils/errors';
import { sendError } from '../utils/response';
import logger from '../utils/logger';
import { config } from '../config';

/**
 * Convert Zod validation errors to our format
 */
const formatZodErrors = (error: ZodError): Array<{ field: string; message: string }> => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

/**
 * Handle Prisma database errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') || 'field';
      return new AppError(`A record with this ${field} already exists`, 409, 'DUPLICATE_ENTRY');
    
    case 'P2025':
      // Record not found
      return new AppError('Record not found', 404, 'NOT_FOUND');
    
    case 'P2003':
      // Foreign key constraint failed
      return new AppError('Related record not found', 400, 'INVALID_REFERENCE');
    
    case 'P2014':
      // Required relation missing
      return new AppError('Required relation not provided', 400, 'MISSING_RELATION');
    
    default:
      logger.error('Unhandled Prisma error:', { code: error.code, meta: error.meta });
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }
};

/**
 * Main error handler middleware
 * Must be registered after all routes
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: config.env === 'development' ? req.body : undefined,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError(formatZodErrors(error));
    sendError(
      res,
      validationError.statusCode,
      validationError.code,
      validationError.message,
      validationError.errors
    );
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(error);
    sendError(res, prismaError.statusCode, prismaError.code, prismaError.message);
    return;
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid data provided');
    return;
  }

  // Handle our custom AppError instances
  if (error instanceof AppError) {
    const details = error instanceof ValidationError ? error.errors : undefined;
    sendError(res, error.statusCode, error.code, error.message, details);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    sendError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token');
    return;
  }

  if (error.name === 'TokenExpiredError') {
    sendError(res, 401, 'TOKEN_EXPIRED', 'Authentication token has expired');
    return;
  }

  // Handle unexpected errors
  // In production, don't leak error details
  const isProduction = config.env === 'production';
  const message = isProduction ? 'An unexpected error occurred' : error.message;
  const code = isProduction ? 'INTERNAL_ERROR' : (error as any).code || 'INTERNAL_ERROR';

  sendError(res, 500, code, message);
};

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates the need for try-catch blocks in every controller
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Unhandled rejection handler
 * Catches unhandled promise rejections
 */
export const setupUnhandledRejectionHandler = (): void => {
  process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Rejection:', { error: reason.message, stack: reason.stack });
    
    // In production, we might want to crash and let process manager restart
    if (config.env === 'production' && !isOperationalError(reason)) {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
    
    // Always exit on uncaught exceptions
    process.exit(1);
  });
};
