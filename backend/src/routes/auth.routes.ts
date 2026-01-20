/**
 * Authentication Routes
 */

import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../utils/validators';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.use(authenticate);
router.post('/logout-all', authController.logoutAll);
router.get('/me', authController.getProfile);
router.patch('/me', validateBody(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authController.changePassword);

export default router;
