/**
 * Matching Controller
 * Handles HTTP requests for matching endpoints
 */

import { Request, Response } from 'express';
import { matchingService, skillGapService } from '../services';
import { sendSuccess, sendPaginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

export const matchingController = {
  /**
   * GET /matches/jobs/:resumeId
   * Get matching jobs for a resume
   */
  getMatchingJobs: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    
    const { matches, total } = await matchingService.getMatchingJobs(
      req.params.resumeId,
      req.user!.id,
      Number(page),
      Number(limit)
    );

    sendPaginated(res, matches, Number(page), Number(limit), total);
  }),

  /**
   * GET /matches/candidates/:jobId
   * Get matching candidates for a job (recruiters only)
   */
  getMatchingCandidates: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    
    const { matches, total } = await matchingService.getMatchingCandidates(
      req.params.jobId,
      req.user!.id,
      Number(page),
      Number(limit)
    );

    sendPaginated(res, matches, Number(page), Number(limit), total);
  }),

  /**
   * POST /matches/:resumeId/:jobId
   * Calculate/recalculate match score
   */
  calculateMatch: asyncHandler(async (req: Request, res: Response) => {
    const match = await matchingService.calculateMatch(
      req.params.resumeId,
      req.params.jobId
    );
    sendSuccess(res, match);
  }),

  /**
   * PATCH /matches/:matchId/status
   * Update match status (shortlist/reject)
   */
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const match = await matchingService.updateMatchStatus(req.params.matchId, status);
    sendSuccess(res, match, `Candidate ${status.toLowerCase()}`);
  }),

  /**
   * GET /skill-gaps/:resumeId/:jobId
   * Get skill gap analysis
   */
  getSkillGap: asyncHandler(async (req: Request, res: Response) => {
    const skillGap = await skillGapService.getSkillGap(
      req.params.resumeId,
      req.params.jobId
    );
    sendSuccess(res, skillGap);
  }),

  /**
   * GET /skill-gaps
   * Get all skill gaps for user
   */
  getUserSkillGaps: asyncHandler(async (req: Request, res: Response) => {
    const skillGaps = await skillGapService.getUserSkillGaps(req.user!.id);
    sendSuccess(res, skillGaps);
  }),

  /**
   * GET /recommendations
   * Get aggregated recommendations for user
   */
  getRecommendations: asyncHandler(async (req: Request, res: Response) => {
    const recommendations = await skillGapService.getAggregatedRecommendations(req.user!.id);
    sendSuccess(res, recommendations);
  }),
};

export default matchingController;
