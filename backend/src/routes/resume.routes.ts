/**
 * Resume Routes
 */

import { Router } from 'express';
import { resumeController } from '../controllers';
import { authenticate, candidateOnly } from '../middlewares/auth';
import { uploadResume, handleMulterError } from '../middlewares/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Candidate-only routes
router.post('/', candidateOnly, uploadResume, handleMulterError, resumeController.upload);
router.get('/', resumeController.getAll);
router.get('/trends', candidateOnly, resumeController.getTrends);
router.get('/:id', resumeController.getById);
router.delete('/:id', candidateOnly, resumeController.delete);
router.post('/:id/reprocess', candidateOnly, resumeController.reprocess);

export default router;
