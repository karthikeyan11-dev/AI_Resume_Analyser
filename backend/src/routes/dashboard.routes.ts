/**
 * Dashboard Routes
 */

import { Router } from 'express';
import { dashboardController } from '../controllers';
import { authenticate, candidateOnly, recruiterOnly } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Role-specific dashboards
router.get('/candidate', candidateOnly, dashboardController.getCandidateDashboard);
router.get('/recruiter', recruiterOnly, dashboardController.getRecruiterDashboard);

// Analytics (role-aware)
router.get('/analytics', dashboardController.getAnalytics);

export default router;
