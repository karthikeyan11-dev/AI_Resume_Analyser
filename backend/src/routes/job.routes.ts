/**
 * Job Routes
 */

import { Router } from 'express';
import { jobController } from '../controllers';
import { authenticate, recruiterOnly, optionalAuth } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { createJobSchema, updateJobSchema } from '../utils/validators';

const router = Router();

// Public route for browsing active jobs
router.get('/active', optionalAuth, jobController.getActive);
router.get('/roles', optionalAuth, jobController.getJobRoles);

// Protected routes
router.use(authenticate);

router.get('/', jobController.getAll);
router.get('/:id', jobController.getById);

// Recruiter-only routes
router.post('/', recruiterOnly, validateBody(createJobSchema), jobController.create);
router.patch('/:id', recruiterOnly, validateBody(updateJobSchema), jobController.update);
router.delete('/:id', recruiterOnly, jobController.delete);
router.post('/:id/publish', recruiterOnly, jobController.publish);

export default router;

