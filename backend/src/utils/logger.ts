/**
 * Logger Utility
 * Production-ready logging using Winston
 * Supports different log levels, formats, and transports
 */

import winston from 'winston';
import { config } from '../config';

// Custom format for readable logs
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create Winston logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'resume-analyzer-api' },
  transports: [
    // Error logs to separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // All logs to combined file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Console output for non-production environments
if (config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      ),
    })
  );
}

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Request logging helper
export const logRequest = (method: string, path: string, statusCode: number, duration: number) => {
  logger.http(`${method} ${path} ${statusCode} - ${duration}ms`);
};

// Error logging helper with context
export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

// Performance logging helper
export const logPerformance = (operation: string, duration: number, metadata?: Record<string, unknown>) => {
  logger.debug(`Performance: ${operation} completed in ${duration}ms`, metadata);
};

export default logger;
