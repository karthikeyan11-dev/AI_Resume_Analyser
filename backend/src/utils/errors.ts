/**
 * Custom Error Classes
 * Standardized error handling for the application
 * Each error type maps to specific HTTP status codes
 */

// Base application error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 400 Bad Request - Invalid input data
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

// 401 Unauthorized - Authentication required
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

// 403 Forbidden - Insufficient permissions
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// 404 Not Found - Resource not found
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

// 409 Conflict - Resource conflict (e.g., duplicate entry)
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

// 422 Unprocessable Entity - Validation errors
export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(
    errors: Array<{ field: string; message: string }>,
    message: string = 'Validation failed'
  ) {
    super(message, 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// 429 Too Many Requests - Rate limiting
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMITED') {
    super(message, 429, code);
  }
}

// 500 Internal Server Error
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
    super(message, 500, code, false);
  }
}

// 503 Service Unavailable - External service failure
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', code: string = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}

// AI-specific errors
export class AIProcessingError extends AppError {
  constructor(message: string = 'AI processing failed', code: string = 'AI_ERROR') {
    super(message, 500, code);
  }
}

// File processing errors
export class FileProcessingError extends AppError {
  constructor(message: string = 'File processing failed', code: string = 'FILE_ERROR') {
    super(message, 400, code);
  }
}

// Helper to check if error is operational (expected) vs programming error
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};
