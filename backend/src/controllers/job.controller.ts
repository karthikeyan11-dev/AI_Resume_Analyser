/**
 * Job Controller
 * Handles HTTP requests for job endpoints
 */

import { Request, Response } from 'express';
import { jobService } from '../services';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

export const jobController = {
  /**
   * POST /jobs
   * Create a new job posting
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.createJob(req.user!.id, req.body);
    sendCreated(res, job, 'Job created and queued for analysis');
  }),

  /**
   * GET /jobs
   * Get all jobs (with filters for recruiters)
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const filters: any = {
      page: Number(page),
      limit: Number(limit),
      search: search as string,
    };

    // Recruiters see their own jobs, candidates see active jobs
    if (req.user?.role === 'RECRUITER') {
      filters.recruiterId = req.user.id;
      if (status) filters.status = status;
    } else {
      filters.status = 'ACTIVE';
    }

    const { jobs, total } = await jobService.getJobs(filters);
    sendPaginated(res, jobs, Number(page), Number(limit), total);
  }),

  /**
   * GET /jobs/:id
   * Get a specific job
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getJobById(req.params.id);
    sendSuccess(res, job);
  }),

  /**
   * PATCH /jobs/:id
   * Update a job posting
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.updateJob(req.params.id, req.user!.id, req.body);
    sendSuccess(res, job, 'Job updated');
  }),

  /**
   * DELETE /jobs/:id
   * Delete a job posting
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await jobService.deleteJob(req.params.id, req.user!.id);
    sendNoContent(res);
  }),

  /**
   * POST /jobs/:id/publish
   * Publish a job (set status to ACTIVE)
   */
  publish: asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.publishJob(req.params.id, req.user!.id);
    sendSuccess(res, job, 'Job published');
  }),

  /**
   * GET /jobs/active
   * Get active jobs for candidates
   */
  getActive: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search } = req.query;
    
    const { jobs, total } = await jobService.getJobs({
      status: 'ACTIVE',
      page: Number(page),
      limit: Number(limit),
      search: search as string,
    });

    sendPaginated(res, jobs, Number(page), Number(limit), total);
  }),

  /**
   * GET /jobs/roles
   * Get distinct job roles/titles for dropdown selection
   */
  getJobRoles: asyncHandler(async (req: Request, res: Response) => {
    const roles = await jobService.getDistinctJobRoles();
    sendSuccess(res, roles);
  }),
};

export default jobController;

