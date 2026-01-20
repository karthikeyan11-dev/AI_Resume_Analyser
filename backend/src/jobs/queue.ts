/**
 * Job Queue Configuration
 * BullMQ queues for background job processing
 */

import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config';
import logger from '../utils/logger';

// Redis connection for BullMQ
const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

// Only create queues if BullMQ is enabled
const createQueue = (name: string, options?: any) => {
  if (!config.features.enableBullMQ) {
    // Return a mock queue when BullMQ is disabled
    return {
      add: async () => ({ id: 'mock-job-id' }),
      close: async () => {},
    } as unknown as Queue;
  }
  return new Queue(name, { connection, defaultJobOptions, ...options });
};

/**
 * Resume Processing Queue
 * Handles PDF parsing and AI analysis of resumes
 */
export const resumeQueue = createQueue('resume-processing');

/**
 * Job Analysis Queue
 * Handles AI analysis of job descriptions
 */
export const jobQueue = createQueue('job-analysis');

/**
 * Matching Queue
 * Handles background calculation of match scores
 */
export const matchingQueue = createQueue('matching', {
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2, // Fewer retries for matching
  },
});

/**
 * Notification Queue
 * Handles sending emails and notifications
 */
export const notificationQueue = createQueue('notifications', {
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
  },
});

// Queue event listeners for monitoring
if (config.features.enableBullMQ) {
  const resumeQueueEvents = new QueueEvents('resume-processing', { connection });
  const jobQueueEvents = new QueueEvents('job-analysis', { connection });

  resumeQueueEvents.on('completed', ({ jobId }) => {
    logger.info('Resume processing completed', { jobId });
  });

  resumeQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error('Resume processing failed', { jobId, reason: failedReason });
  });

  jobQueueEvents.on('completed', ({ jobId }) => {
    logger.info('Job analysis completed', { jobId });
  });

  jobQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error('Job analysis failed', { jobId, reason: failedReason });
  });
}

/**
 * Close all queues gracefully
 */
export const closeQueues = async (): Promise<void> => {
  if (!config.features.enableBullMQ) return;
  
  await Promise.all([
    resumeQueue.close(),
    jobQueue.close(),
    matchingQueue.close(),
    notificationQueue.close(),
  ]);
  logger.info('All queues closed');
};

export default {
  resumeQueue,
  jobQueue,
  matchingQueue,
  notificationQueue,
};
