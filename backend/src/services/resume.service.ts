/**
 * Resume Service
 * Handles resume upload, parsing, and analysis operations
 * 
 * Updated to use:
 * - Groq AI for LLM inference (replacing Gemini)
 * - Embedding service for semantic embeddings
 * - PDF extraction service with OCR support
 * - Job progress tracking for real-time UX
 */

import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { groqService } from './groq.service';
import { embeddingService } from './embedding.service';
import { pdfExtractionService } from './pdfExtraction.service';
import { jobProgressService } from './jobProgress.service';
import { NotFoundError, FileProcessingError } from '../utils/errors';
import { calculatePagination } from '../utils/response';
import logger from '../utils/logger';
import { resumeQueue } from '../jobs/queue';

// Type definitions
interface ResumeCreateInput {
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface ResumeListFilters {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const resumeService = {
  /**
   * Create a new resume record and queue for processing
   */
  async createResume(input: ResumeCreateInput): Promise<{ id: string; status: string }> {
    const resume = await prisma.resume.create({
      data: {
        userId: input.userId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        status: 'PENDING',
      },
    });

    // Queue resume for background processing
    await resumeQueue.add('process-resume', {
      resumeId: resume.id,
      fileUrl: resume.fileUrl,
    });

    logger.info('Resume created and queued for processing:', { resumeId: resume.id });

    // Invalidate user's resume list cache
    await cache.delByPattern(`${cacheKeys.userResumes(input.userId)}*`);

    return {
      id: resume.id,
      status: resume.status,
    };
  },

  /**
   * Extract text from PDF file using enhanced extraction service
   * Supports text PDFs, scanned/image PDFs, and mixed content
   */
  async extractTextFromPdf(filePath: string): Promise<{ text: string; confidence: number; method: string }> {
    try {
      const result = await pdfExtractionService.extractText(filePath, {
        enableOCR: true,
        cleanText: true,
      });
      
      if (!result.text || result.text.trim().length < 50) {
        throw new FileProcessingError('Could not extract sufficient text from resume');
      }
      
      if (result.warnings.length > 0) {
        logger.warn('PDF extraction warnings:', { warnings: result.warnings });
      }
      
      return {
        text: result.text,
        confidence: result.confidence,
        method: result.method,
      };
    } catch (error) {
      logger.error('PDF extraction failed:', { filePath, error });
      throw new FileProcessingError('Failed to extract text from PDF');
    }
  },

  /**
   * Process resume - extract text and analyze with AI
   * This is called by the background job processor
   * Now includes job progress tracking for real-time UX updates
   */
  async processResume(resumeId: string, jobId?: string): Promise<void> {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    // Initialize progress tracking if job ID provided
    if (jobId) {
      await jobProgressService.initializeJob(jobId, resumeId);
    }

    try {
      // Update status to processing
      await prisma.resume.update({
        where: { id: resumeId },
        data: { status: 'PROCESSING' },
      });

      // Stage 1: Extract text from PDF
      if (jobId) await jobProgressService.updateStage(jobId, 'EXTRACTING', 0);
      
      const extraction = await this.extractTextFromPdf(resume.fileUrl);
      const rawText = extraction.text;

      if (!rawText || rawText.trim().length < 50) {
        throw new FileProcessingError('Could not extract sufficient text from resume');
      }

      // Update resume with raw text
      await prisma.resume.update({
        where: { id: resumeId },
        data: { rawText },
      });

      if (jobId) await jobProgressService.updateStage(jobId, 'EXTRACTING', 100, {
        extractionMethod: extraction.method,
        confidence: extraction.confidence,
      });

      // Stage 2: Analyze with AI (Groq)
      if (jobId) await jobProgressService.updateStage(jobId, 'ANALYZING', 0);
      
      const analysis = await groqService.analyzeResume(rawText);
      
      if (jobId) await jobProgressService.updateStage(jobId, 'ANALYZING', 100);

      // Stage 3: Generate skills embedding for matching
      if (jobId) await jobProgressService.updateStage(jobId, 'GENERATING_EMBEDDINGS', 0);
      
      const skillsText = analysis.skills.join(' ');
      const skillsEmbedding = await embeddingService.generateEmbedding(skillsText);
      
      if (jobId) await jobProgressService.updateStage(jobId, 'GENERATING_EMBEDDINGS', 100);

      // Stage 4: Finalize - Create analysis record
      if (jobId) await jobProgressService.updateStage(jobId, 'FINALIZING', 0);
      
      await prisma.resumeAnalysis.create({
        data: {
          resumeId,
          skills: analysis.skills,
          skillsEmbedding,
          experienceSummary: analysis.experienceSummary,
          totalYearsExp: analysis.totalYearsExperience,
          experienceLevel: analysis.experienceLevel,
          educationSummary: analysis.educationSummary,
          highestDegree: analysis.highestDegree,
          atsScore: analysis.atsScore,
          atsIssues: analysis.atsIssues,
          atsSuggestions: analysis.atsSuggestions,
          contactInfo: analysis.contactInfo,
          certifications: analysis.certifications,
          languages: analysis.languages,
          summary: analysis.summary,
        },
      });

      // Update resume status
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: 'ANALYZED',
          analyzedAt: new Date(),
        },
      });

      // Clear cache
      await cache.del(cacheKeys.resume(resumeId));
      await cache.del(cacheKeys.resumeAnalysis(resumeId));

      // Mark job as complete
      if (jobId) {
        await jobProgressService.markCompleted(jobId, {
          atsScore: analysis.atsScore,
          skillCount: analysis.skills.length,
        });
      }

      logger.info('Resume processed successfully:', { resumeId, atsScore: analysis.atsScore });
    } catch (error) {
      // Update status to failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          status: 'FAILED',
          processingError: errorMessage,
        },
      });

      // Mark job as failed
      if (jobId) {
        await jobProgressService.markFailed(jobId, errorMessage);
      }

      logger.error('Resume processing failed:', { resumeId, error: errorMessage });
      throw error;
    }
  },

  /**
   * Get resume by ID with analysis
   */
  async getResumeById(resumeId: string, userId?: string): Promise<any> {
    const cacheKey = cacheKeys.resume(resumeId);
    
    return cache.getOrSet(cacheKey, async () => {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
        include: {
          analysis: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!resume) {
        throw new NotFoundError('Resume not found');
      }

      // Check ownership if userId provided
      if (userId && resume.userId !== userId) {
        throw new NotFoundError('Resume not found');
      }

      return resume;
    }, 3600);
  },

  /**
   * Get resumes for a user with pagination
   */
  async getUserResumes(
    userId: string,
    filters: ResumeListFilters = {}
  ): Promise<{ resumes: any[]; total: number }> {
    const { skip, take } = calculatePagination(filters.page, filters.limit);

    const where: any = { userId };
    if (filters.status) {
      where.status = filters.status;
    }

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({
        where,
        include: {
          analysis: {
            select: {
              atsScore: true,
              experienceLevel: true,
              skills: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.resume.count({ where }),
    ]);

    return { resumes, total };
  },

  /**
   * Delete a resume
   */
  async deleteResume(resumeId: string, userId: string): Promise<void> {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new NotFoundError('Resume not found');
    }

    // Delete file from storage
    try {
      if (fs.existsSync(resume.fileUrl)) {
        fs.unlinkSync(resume.fileUrl);
      }
    } catch (error) {
      logger.warn('Failed to delete resume file:', { fileUrl: resume.fileUrl, error });
    }

    // Delete from database (cascades to analysis, matches, etc.)
    await prisma.resume.delete({
      where: { id: resumeId },
    });

    // Clear cache
    await cache.del(cacheKeys.resume(resumeId));
    await cache.del(cacheKeys.resumeAnalysis(resumeId));
    await cache.delByPattern(`${cacheKeys.userResumes(userId)}*`);

    logger.info('Resume deleted:', { resumeId });
  },

  /**
   * Get resume score trends for analytics
   */
  async getScoreTrends(userId: string): Promise<any[]> {
    const resumes = await prisma.resume.findMany({
      where: {
        userId,
        status: 'ANALYZED',
      },
      include: {
        analysis: {
          select: {
            atsScore: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    return resumes.map((r) => ({
      date: r.createdAt,
      fileName: r.fileName,
      atsScore: r.analysis?.atsScore || 0,
    }));
  },

  /**
   * Reprocess a failed resume
   */
  async reprocessResume(resumeId: string, userId: string): Promise<void> {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new NotFoundError('Resume not found');
    }

    if (resume.status !== 'FAILED') {
      throw new FileProcessingError('Resume is not in failed state');
    }

    // Reset status and re-queue
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        status: 'PENDING',
        processingError: null,
      },
    });

    await resumeQueue.add('process-resume', {
      resumeId: resume.id,
      fileUrl: resume.fileUrl,
    });

    logger.info('Resume re-queued for processing:', { resumeId });
  },
};

export default resumeService;
