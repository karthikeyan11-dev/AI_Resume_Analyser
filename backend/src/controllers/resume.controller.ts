/**
 * Resume Controller
 * Handles HTTP requests for resume endpoints
 */

import { Request, Response } from 'express';
import { resumeService } from '../services';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import { BadRequestError } from '../utils/errors';
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
};

export default resumeController;
