/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response } from 'express';
import { authService } from '../services';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

export const authController = {
  /**
   * POST /auth/register
   * Register a new user
   */
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    sendCreated(res, result, 'Registration successful');
  }),

  /**
   * POST /auth/login
   * Login user
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 'Login successful');
  }),

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 'Token refreshed');
  }),

  /**
   * POST /auth/logout
   * Logout user
   */
  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    sendNoContent(res);
  }),

  /**
   * POST /auth/logout-all
   * Logout all sessions
   */
  logoutAll: asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.id);
    sendNoContent(res);
  }),

  /**
   * GET /auth/me
   * Get current user profile
   */
  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getUserById(req.user!.id);
    sendSuccess(res, user);
  }),

  /**
   * PATCH /auth/me
   * Update current user profile
   */
  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, user, 'Profile updated');
  }),

  /**
   * POST /auth/change-password
   * Change password
   */
  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  }),
};

export default authController;
