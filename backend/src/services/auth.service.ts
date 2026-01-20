/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import prisma from '../config/database';
import { 
  UnauthorizedError, 
  ConflictError, 
  NotFoundError 
} from '../utils/errors';
import { RegisterInput, LoginInput } from '../utils/validators';
import { UserRole } from '@prisma/client';
import logger from '../utils/logger';

// Token payload structure
interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

// Token response structure
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// User response structure (without password)
interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone: string | null;
  linkedinUrl: string | null;
  createdAt: Date;
}

/**
 * Generate access and refresh tokens
 */
const generateTokens = async (user: {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}): Promise<TokenResponse> => {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    payload, 
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions
  );

  // Generate refresh token (long-lived)
  const refreshToken = uuidv4();
  
  // Calculate expiry time for refresh token
  const refreshExpiryMs = parseExpiry(config.jwt.refreshExpiry);
  const expiresAt = new Date(Date.now() + refreshExpiryMs);

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Calculate access token expiry in seconds
  const accessExpiryMs = parseExpiry(config.jwt.accessExpiry);

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(accessExpiryMs / 1000),
  };
};

/**
 * Parse expiry string (e.g., '15m', '7d') to milliseconds
 */
const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

/**
 * Transform user to response format (exclude sensitive data)
 */
const toUserResponse = (user: any): UserResponse => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  phone: user.phone,
  linkedinUrl: user.linkedinUrl,
  createdAt: user.createdAt,
});

export const authService = {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<{ user: UserResponse; tokens: TokenResponse }> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role || 'CANDIDATE',
      },
    });

    logger.info('User registered:', { userId: user.id, email: user.email, role: user.role });

    // Generate tokens
    const tokens = await generateTokens(user);

    return {
      user: toUserResponse(user),
      tokens,
    };
  },

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<{ user: UserResponse; tokens: TokenResponse }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('User logged in:', { userId: user.id, email: user.email });

    // Generate tokens
    const tokens = await generateTokens(user);

    return {
      user: toUserResponse(user),
      tokens,
    };
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Check user status
    if (storedToken.user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return generateTokens(storedToken.user);
  },

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Logout all sessions - revoke all refresh tokens for user
   */
  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { 
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    logger.info('All sessions logged out:', { userId });
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toUserResponse(user);
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string | null; linkedinUrl?: string | null }
  ): Promise<UserResponse> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return toUserResponse(user);
  },

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens (force re-login)
    await this.logoutAll(userId);

    logger.info('Password changed:', { userId });
  },

  /**
   * Clean up expired refresh tokens
   * Should be run periodically as a background job
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });

    logger.info('Cleaned up expired tokens:', { count: result.count });
    return result.count;
  },
};

export default authService;
