/**
 * Job Workers
 * BullMQ workers for processing background jobs
 */

import { Worker, Job, Processor } from 'bullmq';
import { config } from '../config';
import { resumeService } from '../services/resume.service';
import { jobService } from '../services/job.service';
import { matchingService } from '../services/matching.service';
import logger from '../utils/logger';

// Redis connection for workers
const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

// Worker options
const workerOptions = {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
};

// Mock worker for when BullMQ is disabled
const createMockWorker = () => ({
  on: () => {},
  close: async () => {},
});

// Workers (only created if BullMQ is enabled)
let resumeWorker: Worker | ReturnType<typeof createMockWorker>;
let jobAnalysisWorker: Worker | ReturnType<typeof createMockWorker>;
let matchingWorker: Worker | ReturnType<typeof createMockWorker>;

if (config.features.enableBullMQ) {
  /**
   * Resume Processing Worker
   * Now passes job ID for real-time progress tracking
   */
  resumeWorker = new Worker(
    'resume-processing',
    async (job: Job) => {
      const { resumeId } = job.data;
      logger.info('Processing resume:', { jobId: job.id, resumeId });

      // Pass job.id as string for progress tracking
      // The resumeService.processResume now updates progress in real-time
      await resumeService.processResume(resumeId, job.id as string);

      return { resumeId, status: 'completed' };
    },
    workerOptions
  );

  // Resume worker event handlers
  resumeWorker.on('completed', (job) => {
    logger.info('Resume worker completed:', { jobId: job.id, result: job.returnvalue });
  });

  resumeWorker.on('failed', (job, error) => {
    logger.error('Resume worker failed:', { jobId: job?.id, error: error.message });
  });

  /**
   * Job Analysis Worker
   */
  jobAnalysisWorker = new Worker(
    'job-analysis',
    async (job: Job) => {
      const { jobId } = job.data;
      logger.info('Analyzing job:', { workerId: job.id, jobId });

      await job.updateProgress(10);
      await jobService.analyzeJob(jobId);
      await job.updateProgress(100);

      return { jobId, status: 'analyzed' };
    },
    workerOptions
  );

  jobAnalysisWorker.on('completed', (job) => {
    logger.info('Job analysis completed:', { jobId: job.id });
  });

  jobAnalysisWorker.on('failed', (job, error) => {
    logger.error('Job analysis failed:', { jobId: job?.id, error: error.message });
  });

  /**
   * Matching Worker
   */
  matchingWorker = new Worker(
    'matching',
    async (job: Job) => {
      const { resumeId, jobId } = job.data;
      logger.info('Calculating match:', { resumeId, jobId });

      const result = await matchingService.calculateMatch(resumeId, jobId);

      return { matchId: result.id, score: result.overallScore };
    },
    workerOptions
  );

  matchingWorker.on('completed', (job) => {
    logger.info('Matching completed:', { jobId: job.id, result: job.returnvalue });
  });

  matchingWorker.on('failed', (job, error) => {
    logger.error('Matching failed:', { jobId: job?.id, error: error.message });
  });
} else {
  // Create mock workers when BullMQ is disabled
  resumeWorker = createMockWorker();
  jobAnalysisWorker = createMockWorker();
  matchingWorker = createMockWorker();
}

/**
 * Start all workers
 */
export const startWorkers = (): void => {
  if (!config.features.enableBullMQ) {
    logger.warn('BullMQ is disabled. Workers will not start.');
    return;
  }

  logger.info('Starting background workers...');
  // Workers are automatically started when instantiated
};

/**
 * Stop all workers gracefully
 */
export const stopWorkers = async (): Promise<void> => {
  if (!config.features.enableBullMQ) return;
  
  await Promise.all([
    resumeWorker.close(),
    jobAnalysisWorker.close(),
    matchingWorker.close(),
  ]);
  logger.info('All workers stopped');
};

export { resumeWorker, jobAnalysisWorker, matchingWorker };

export default {
  resumeWorker,
  jobAnalysisWorker,
  matchingWorker,
  startWorkers,
  stopWorkers,
};
