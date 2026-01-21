/**
 * Matching Routes
 */

import { Router } from 'express';
import { matchingController } from '../controllers';
import { authenticate, candidateOnly, recruiterOnly } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Candidate routes
router.get('/jobs/:resumeId', candidateOnly, matchingController.getMatchingJobs);
router.get('/skill-gaps', candidateOnly, matchingController.getUserSkillGaps);
router.get('/skill-gaps/:resumeId/:jobId', candidateOnly, matchingController.getSkillGap);
router.get('/recommendations', candidateOnly, matchingController.getRecommendations);
router.post('/calculate-all/:resumeId', candidateOnly, matchingController.calculateAllMatches);

// Recruiter routes
router.get('/candidates/:jobId', recruiterOnly, matchingController.getMatchingCandidates);
router.patch('/:matchId/status', recruiterOnly, matchingController.updateStatus);

// Calculate match (both roles)
router.post('/:resumeId/:jobId', matchingController.calculateMatch);

export default router;

