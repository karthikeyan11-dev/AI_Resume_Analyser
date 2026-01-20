/**
 * API Routes Index
 * Combines all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import resumeRoutes from './resume.routes';
import jobRoutes from './job.routes';
import matchingRoutes from './matching.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/jobs', jobRoutes);
router.use('/matches', matchingRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
