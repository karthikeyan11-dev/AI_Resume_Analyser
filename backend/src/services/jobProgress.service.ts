/**
 * Job Progress Service
 * Real-time progress tracking for background job processing
 * 
 * Features:
 * - Granular job status updates
 * - Progress percentage tracking
 * - Step-by-step status (Uploading → Extracting → Analyzing → Matching → Complete)
 * - Redis-backed for real-time updates
 * - Support for SSE (Server-Sent Events) streaming
 */

import { cache } from '../config/redis';
import logger from '../utils/logger';

// Job processing stages with weights for progress calculation
export const JOB_STAGES = {
  QUEUED: { order: 0, weight: 0, label: 'Queued', description: 'Waiting in queue' },
  UPLOADING: { order: 1, weight: 5, label: 'Uploading', description: 'Uploading file' },
  EXTRACTING: { order: 2, weight: 20, label: 'Extracting Text', description: 'Extracting text from PDF' },
  ANALYZING: { order: 3, weight: 50, label: 'Analyzing Resume', description: 'AI analyzing resume content' },
  GENERATING_EMBEDDINGS: { order: 4, weight: 15, label: 'Processing', description: 'Generating semantic embeddings' },
  MATCHING_JOBS: { order: 5, weight: 8, label: 'Matching Jobs', description: 'Finding matching job opportunities' },
  FINALIZING: { order: 6, weight: 2, label: 'Finalizing', description: 'Saving analysis results' },
  COMPLETED: { order: 7, weight: 0, label: 'Completed', description: 'Analysis complete' },
  FAILED: { order: -1, weight: 0, label: 'Failed', description: 'Processing failed' },
} as const;

export type JobStage = keyof typeof JOB_STAGES;

export interface JobProgress {
  jobId: string;
  resumeId: string;
  stage: JobStage;
  progress: number; // 0-100
  stageProgress: number; // Progress within current stage (0-100)
  message: string;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

// Redis key prefix for job progress
const PROGRESS_KEY_PREFIX = 'job:progress:';
const PROGRESS_TTL = 86400; // 24 hours

/**
 * Calculate overall progress based on stage and stage progress
 */
function calculateOverallProgress(stage: JobStage, stageProgress: number): number {
  const stageInfo = JOB_STAGES[stage];
  
  if (stage === 'COMPLETED') return 100;
  if (stage === 'FAILED') return 0;
  
  // Calculate progress up to current stage
  let baseProgress = 0;
  for (const [key, info] of Object.entries(JOB_STAGES)) {
    if (info.order < stageInfo.order) {
      baseProgress += info.weight;
    }
  }
  
  // Add progress within current stage
  const stageContribution = (stageProgress / 100) * stageInfo.weight;
  
  return Math.min(99, Math.round(baseProgress + stageContribution));
}

export const jobProgressService = {
  /**
   * Initialize job progress tracking
   */
  async initializeJob(jobId: string, resumeId: string): Promise<JobProgress> {
    const progress: JobProgress = {
      jobId,
      resumeId,
      stage: 'QUEUED',
      progress: 0,
      stageProgress: 0,
      message: JOB_STAGES.QUEUED.description,
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveProgress(progress);
    logger.info('Job progress initialized', { jobId, resumeId });
    
    return progress;
  },

  /**
   * Update job stage
   */
  async updateStage(
    jobId: string,
    stage: JobStage,
    stageProgress: number = 0,
    metadata?: Record<string, any>
  ): Promise<JobProgress | null> {
    const existing = await this.getProgress(jobId);
    if (!existing) {
      logger.warn('Job progress not found for update', { jobId });
      return null;
    }

    const stageInfo = JOB_STAGES[stage];
    const overallProgress = calculateOverallProgress(stage, stageProgress);

    const updated: JobProgress = {
      ...existing,
      stage,
      progress: overallProgress,
      stageProgress,
      message: stageInfo.description,
      updatedAt: new Date(),
      completedAt: stage === 'COMPLETED' ? new Date() : undefined,
      metadata: { ...existing.metadata, ...metadata },
    };

    await this.saveProgress(updated);
    
    logger.debug('Job progress updated', { 
      jobId, 
      stage, 
      progress: overallProgress,
      stageProgress 
    });

    return updated;
  },

  /**
   * Update progress within current stage
   */
  async updateStageProgress(
    jobId: string,
    stageProgress: number,
    message?: string
  ): Promise<JobProgress | null> {
    const existing = await this.getProgress(jobId);
    if (!existing) return null;

    const overallProgress = calculateOverallProgress(existing.stage, stageProgress);

    const updated: JobProgress = {
      ...existing,
      progress: overallProgress,
      stageProgress,
      message: message || existing.message,
      updatedAt: new Date(),
    };

    await this.saveProgress(updated);
    return updated;
  },

  /**
   * Mark job as failed
   */
  async markFailed(jobId: string, error: string): Promise<JobProgress | null> {
    const existing = await this.getProgress(jobId);
    if (!existing) return null;

    const updated: JobProgress = {
      ...existing,
      stage: 'FAILED',
      progress: 0,
      message: 'Processing failed',
      error,
      updatedAt: new Date(),
    };

    await this.saveProgress(updated);
    logger.error('Job marked as failed', { jobId, error });

    return updated;
  },

  /**
   * Mark job as completed
   */
  async markCompleted(jobId: string, metadata?: Record<string, any>): Promise<JobProgress | null> {
    return this.updateStage(jobId, 'COMPLETED', 100, metadata);
  },

  /**
   * Get current job progress
   */
  async getProgress(jobId: string): Promise<JobProgress | null> {
    try {
      const key = `${PROGRESS_KEY_PREFIX}${jobId}`;
      const data = await cache.get<JobProgress>(key);
      
      if (!data) return null;
      
      return data;
    } catch (error) {
      logger.error('Failed to get job progress', { jobId, error });
      return null;
    }
  },

  /**
   * Get progress by resume ID
   * Useful when the job ID is not known
   */
  async getProgressByResumeId(resumeId: string): Promise<JobProgress | null> {
    // Look up the job ID from resume ID mapping
    const jobId = await cache.get<string>(`resume:job:${resumeId}`);
    if (!jobId) return null;
    
    return this.getProgress(jobId);
  },

  /**
   * Save progress to Redis
   */
  async saveProgress(progress: JobProgress): Promise<void> {
    const key = `${PROGRESS_KEY_PREFIX}${progress.jobId}`;
    await cache.set<JobProgress>(key, progress, PROGRESS_TTL);
    
    // Also save resume->job mapping for reverse lookup
    await cache.set<string>(`resume:job:${progress.resumeId}`, progress.jobId, PROGRESS_TTL);
  },

  /**
   * Delete job progress (cleanup)
   */
  async deleteProgress(jobId: string): Promise<void> {
    const progress = await this.getProgress(jobId);
    if (progress) {
      await cache.del(`resume:job:${progress.resumeId}`);
    }
    await cache.del(`${PROGRESS_KEY_PREFIX}${jobId}`);
  },

  /**
   * Get all active jobs for a user (by resume IDs)
   */
  async getActiveJobs(resumeIds: string[]): Promise<JobProgress[]> {
    const progresses: JobProgress[] = [];
    
    for (const resumeId of resumeIds) {
      const progress = await this.getProgressByResumeId(resumeId);
      if (progress && progress.stage !== 'COMPLETED' && progress.stage !== 'FAILED') {
        progresses.push(progress);
      }
    }
    
    return progresses;
  },

  /**
   * Get human-readable stage info
   */
  getStageInfo(stage: JobStage): typeof JOB_STAGES[JobStage] {
    return JOB_STAGES[stage];
  },

  /**
   * Get all stages in order (for UI display)
   */
  getAllStages(): Array<{ key: JobStage; info: typeof JOB_STAGES[JobStage] }> {
    return Object.entries(JOB_STAGES)
      .filter(([_, info]) => info.order >= 0)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, info]) => ({
        key: key as JobStage,
        info,
      }));
  },
};

export default jobProgressService;
