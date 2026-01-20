/**
 * Redis Client Configuration
 * Used for caching and as a backend for BullMQ job queues
 */

import Redis from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// Create Redis connection with configuration
const createRedisClient = (): Redis | null => {
  if (!config.features.enableRedis) {
    logger.warn('Redis is disabled. Caching features will not work.');
    return null;
  }

  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.error('Redis connection failed after 3 attempts');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true, // Don't connect immediately
  });

  // Event handlers
  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (error: Error) => {
    logger.error('Redis client error:', { error: error.message });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return client;
};

// Singleton Redis client
const redis = createRedisClient();

/**
 * Cache utility functions
 */
export const cache = {
  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  },

  /**
   * Set cached value with expiration
   */
  async set<T>(key: string, value: T, expirySeconds: number = 3600): Promise<boolean> {
    if (!redis) return false;
    
    try {
      await redis.set(key, JSON.stringify(value), 'EX', expirySeconds);
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    if (!redis) return false;
    
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  },

  /**
   * Delete cached values by pattern
   */
  async delByPattern(pattern: string): Promise<boolean> {
    if (!redis) return false;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete by pattern error:', { pattern, error });
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!redis) return false;
    
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  },

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    expirySeconds: number = 3600
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache it asynchronously
    this.set(key, data, expirySeconds).catch(() => {
      // Ignore cache set errors
    });

    return data;
  },
};

/**
 * Cache key generators for consistency
 */
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  resume: (id: string) => `resume:${id}`,
  resumeAnalysis: (id: string) => `resume:analysis:${id}`,
  job: (id: string) => `job:${id}`,
  jobAnalysis: (id: string) => `job:analysis:${id}`,
  matchScore: (resumeId: string, jobId: string) => `match:${resumeId}:${jobId}`,
  userResumes: (userId: string) => `user:${userId}:resumes`,
  userJobs: (userId: string) => `user:${userId}:jobs`,
  jobMatches: (jobId: string) => `job:${jobId}:matches`,
  resumeMatches: (resumeId: string) => `resume:${resumeId}:matches`,
};

// Connect to Redis on startup
export const connectRedis = async (): Promise<void> => {
  if (redis) {
    try {
      await redis.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', { error });
    }
  }
};

// Disconnect from Redis on shutdown
export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    logger.info('Redis disconnected');
  }
};

export default redis;
