/**
 * Job Service
 * Handles job posting creation, analysis, and management
 */

import prisma from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { groqService } from './groq.service';
import { embeddingService } from './embedding.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { calculatePagination } from '../utils/response';
import { CreateJobInput, UpdateJobInput } from '../utils/validators';
import logger from '../utils/logger';
import { jobQueue } from '../jobs/queue';

interface JobListFilters {
  recruiterId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const jobService = {
  async createJob(recruiterId: string, input: CreateJobInput): Promise<any> {
    const job = await prisma.job.create({
      data: {
        recruiterId,
        title: input.title,
        company: input.company,
        location: input.location,
        salary: input.salary,
        jobType: input.jobType,
        description: input.description,
        status: 'DRAFT',
      },
    });

    await jobQueue.add('analyze-job', { jobId: job.id });
    logger.info('Job created:', { jobId: job.id });
    await cache.delByPattern(`${cacheKeys.userJobs(recruiterId)}*`);
    return job;
  },

  async analyzeJob(jobId: string): Promise<void> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job not found');

    const analysis = await groqService.analyzeJobDescription(job.description, job.title);
    const allSkills = [...analysis.requiredSkills, ...analysis.preferredSkills];
    const skillsEmbedding = await embeddingService.generateEmbedding(allSkills.join(' '));

    await prisma.jobAnalysis.upsert({
      where: { jobId },
      create: {
        jobId,
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        skillsEmbedding,
        minExperience: analysis.minExperience,
        maxExperience: analysis.maxExperience,
        experienceLevel: analysis.experienceLevel,
        requiredEducation: analysis.requiredEducation,
        keywords: analysis.keywords,
        responsibilities: analysis.responsibilities,
        benefits: analysis.benefits,
      },
      update: {
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        skillsEmbedding,
        minExperience: analysis.minExperience,
        maxExperience: analysis.maxExperience,
        experienceLevel: analysis.experienceLevel,
        requiredEducation: analysis.requiredEducation,
        keywords: analysis.keywords,
        responsibilities: analysis.responsibilities,
        benefits: analysis.benefits,
      },
    });

    await cache.del(cacheKeys.job(jobId));
    logger.info('Job analyzed:', { jobId });
  },

  async getJobById(jobId: string): Promise<any> {
    return cache.getOrSet(cacheKeys.job(jobId), async () => {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          analysis: true,
          recruiter: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
      if (!job) throw new NotFoundError('Job not found');
      return job;
    }, 3600);
  },

  async getJobs(filters: JobListFilters = {}): Promise<{ jobs: any[]; total: number }> {
    const { skip, take } = calculatePagination(filters.page, filters.limit);
    const where: any = {};

    if (filters.recruiterId) where.recruiterId = filters.recruiterId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          analysis: { select: { requiredSkills: true, experienceLevel: true } },
          _count: { select: { matchScores: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs, total };
  },

  async updateJob(jobId: string, recruiterId: string, input: UpdateJobInput): Promise<any> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.recruiterId !== recruiterId) throw new NotFoundError('Job not found');

    const updateData: any = { ...input };
    if (input.status === 'ACTIVE' && !job.publishedAt) updateData.publishedAt = new Date();
    if (input.status === 'CLOSED') updateData.closedAt = new Date();

    const updated = await prisma.job.update({ where: { id: jobId }, data: updateData });
    if (input.description) await jobQueue.add('analyze-job', { jobId });

    await cache.del(cacheKeys.job(jobId));
    return updated;
  },

  async deleteJob(jobId: string, recruiterId: string): Promise<void> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.recruiterId !== recruiterId) throw new NotFoundError('Job not found');

    await prisma.job.delete({ where: { id: jobId } });
    await cache.del(cacheKeys.job(jobId));
    logger.info('Job deleted:', { jobId });
  },

  async publishJob(jobId: string, recruiterId: string): Promise<any> {
    const job = await prisma.job.findUnique({ where: { id: jobId }, include: { analysis: true } });
    if (!job || job.recruiterId !== recruiterId) throw new NotFoundError('Job not found');
    if (job.status === 'ACTIVE') throw new BadRequestError('Job already published');
    if (!job.analysis) throw new BadRequestError('Job analysis not complete');

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: { status: 'ACTIVE', publishedAt: new Date() },
    });

    await cache.del(cacheKeys.job(jobId));
    return updated;
  },

  /**
   * Get distinct job roles/titles for dropdown selection
   */
  async getDistinctJobRoles(): Promise<{ title: string; count: number }[]> {
    const roles = await prisma.job.groupBy({
      by: ['title'],
      where: { status: 'ACTIVE' },
      _count: { title: true },
      orderBy: { _count: { title: 'desc' } },
      take: 50,
    });

    return roles.map(r => ({
      title: r.title,
      count: r._count.title,
    }));
  },
};

export default jobService;

