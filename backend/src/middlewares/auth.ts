/**
 * Authentication Middleware
 * JWT token verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
      };
    }
  }
}

// JWT payload structure
interface JwtPayload {
  sub: string;       // User ID
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  iat: number;       // Issued at
  exp: number;       // Expiry
}

/**
 * Verify JWT token and attach user to request
 * This middleware requires authentication
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, role: true, status: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - attaches user if token present, continues otherwise
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, role: true, status: true, firstName: true, lastName: true },
      });

      if (user && user.status === 'ACTIVE') {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      }
    } catch {
      // Token invalid - continue as unauthenticated
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware factory
 * Restricts access to specific user roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
};

/**
 * Convenience middleware for candidate-only routes
 */
export const candidateOnly = authorize('CANDIDATE');

/**
 * Convenience middleware for recruiter-only routes
 */
export const recruiterOnly = authorize('RECRUITER');

/**
 * Convenience middleware for admin-only routes
 */
export const adminOnly = authorize('ADMIN');

/**
 * Resource ownership verification middleware factory
 * Ensures user owns the resource they're trying to access
 */
export const verifyOwnership = (
  getResourceUserId: (req: Request) => Promise<string | null>
) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Admins can access any resource
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);

      if (!resourceUserId) {
        throw new ForbiddenError('Resource not found or access denied');
      }

      if (resourceUserId !== req.user.id) {
        throw new ForbiddenError('You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
