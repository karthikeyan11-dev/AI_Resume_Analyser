/**
 * Auth Service Unit Tests
 */

import bcrypt from 'bcryptjs';
import { authService } from '../../services/auth.service';
import prisma from '../../config/database';
import { ConflictError, UnauthorizedError } from '../../utils/errors';

// Mock Prisma
jest.mock('../../config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'CANDIDATE' as const,
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: validInput.email,
        firstName: validInput.firstName,
        lastName: validInput.lastName,
        role: 'CANDIDATE',
        phone: null,
        linkedinUrl: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.register(validInput);

      expect(result.user.email).toBe(validInput.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictError if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await expect(authService.register(validInput)).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully with correct credentials', async () => {
      const passwordHash = await bcrypt.hash(validInput.password, 12);
      const mockUser = {
        id: 'user-id-123',
        email: validInput.email,
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        role: 'CANDIDATE',
        status: 'ACTIVE',
        phone: null,
        linkedinUrl: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login(validInput);

      expect(result.user.email).toBe(validInput.email);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(validInput)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for incorrect password', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: validInput.email,
        passwordHash: await bcrypt.hash('different-password', 12),
        status: 'ACTIVE',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(validInput)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: validInput.email,
        passwordHash: await bcrypt.hash(validInput.password, 12),
        status: 'INACTIVE',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(validInput)).rejects.toThrow(UnauthorizedError);
    });
  });
});
