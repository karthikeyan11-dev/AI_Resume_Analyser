/**
 * Resume Controller
 * Handles HTTP requests for resume endpoints
 * 
 * Enhanced with:
 * - Job progress tracking for real-time UX
 * - Full report retrieval for comprehensive analysis
 */

import { Request, Response } from 'express';
import { resumeService, jobProgressService, reportService } from '../services';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import path from 'path';
import { config } from '../config';

export const resumeController = {
  /**
   * POST /resumes
   * Upload and create a new resume
   */
  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const result = await resumeService.createResume({
      userId: req.user!.id,
      fileName: req.file.originalname,
      fileUrl: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    sendCreated(res, result, 'Resume uploaded and queued for processing');
  }),

  /**
   * GET /resumes
   * Get user's resumes with pagination
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, status } = req.query;
    
    const { resumes, total } = await resumeService.getUserResumes(req.user!.id, {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
    });

    sendPaginated(res, resumes, Number(page), Number(limit), total);
  }),

  /**
   * GET /resumes/:id
   * Get a specific resume with analysis
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const resume = await resumeService.getResumeById(req.params.id, req.user!.id);
    sendSuccess(res, resume);
  }),

  /**
   * DELETE /resumes/:id
   * Delete a resume
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await resumeService.deleteResume(req.params.id, req.user!.id);
    sendNoContent(res);
  }),

  /**
   * POST /resumes/:id/reprocess
   * Reprocess a failed resume
   */
  reprocess: asyncHandler(async (req: Request, res: Response) => {
    await resumeService.reprocessResume(req.params.id, req.user!.id);
    sendSuccess(res, null, 'Resume requeued for processing');
  }),

  /**
   * GET /resumes/trends
   * Get ATS score trends for the user
   */
  getTrends: asyncHandler(async (req: Request, res: Response) => {
    const trends = await resumeService.getScoreTrends(req.user!.id);
    sendSuccess(res, trends);
  }),

  /**
   * GET /resumes/:id/progress
   * Get real-time job processing progress
   * Returns current stage, percentage, and status message
   */
  getProgress: asyncHandler(async (req: Request, res: Response) => {
    const resumeId = req.params.id;
    
    // First verify the resume belongs to the user
    const resume = await resumeService.getResumeById(resumeId, req.user!.id);
    
    // Get progress from Redis
    const progress = await jobProgressService.getProgressByResumeId(resumeId);
    
    if (!progress) {
      // If no progress found, return resume status as fallback
      sendSuccess(res, {
        resumeId,
        stage: resume.status,
        progress: resume.status === 'ANALYZED' ? 100 : (resume.status === 'FAILED' ? 0 : 50),
        message: resume.status === 'ANALYZED' 
          ? 'Analysis complete' 
          : (resume.status === 'FAILED' ? 'Processing failed' : 'Processing...'),
        isComplete: resume.status === 'ANALYZED' || resume.status === 'FAILED',
      });
      return;
    }

    sendSuccess(res, {
      ...progress,
      isComplete: progress.stage === 'COMPLETED' || progress.stage === 'FAILED',
    });
  }),

  /**
   * GET /resumes/:id/report
   * Get comprehensive resume analysis report
   * Includes all matched jobs, skill gaps, and AI recommendations
   */
  getFullReport: asyncHandler(async (req: Request, res: Response) => {
    const resumeId = req.params.id;
    const { refresh, skillGaps } = req.query;
    
    const report = await reportService.generateFullReport(
      resumeId,
      req.user!.id,
      {
        forceRefresh: refresh === 'true',
        includeSkillGaps: skillGaps !== 'false', // Include by default
      }
    );

    sendSuccess(res, report);
  }),
};

export default resumeController;

