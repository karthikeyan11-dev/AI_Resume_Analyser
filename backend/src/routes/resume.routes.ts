/**
 * Resume Routes
 * 
 * Enhanced with:
 * - Job progress status endpoint for real-time UX
 * - Full report endpoint for comprehensive analysis
 */

import { Router } from 'express';
import { resumeController } from '../controllers';
import { authenticate, candidateOnly } from '../middlewares/auth';
import { uploadResume, handleMulterError } from '../middlewares/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Candidate-only routes for resume management
router.post('/', candidateOnly, uploadResume, handleMulterError, resumeController.upload);
router.get('/', resumeController.getAll);
router.get('/trends', candidateOnly, resumeController.getTrends);

// Job progress tracking (new)
router.get('/:id/progress', candidateOnly, resumeController.getProgress);

// Full report retrieval (new)
router.get('/:id/report', candidateOnly, resumeController.getFullReport);

// Single resume operations
router.get('/:id', resumeController.getById);
router.delete('/:id', candidateOnly, resumeController.delete);
router.post('/:id/reprocess', candidateOnly, resumeController.reprocess);

export default router;

