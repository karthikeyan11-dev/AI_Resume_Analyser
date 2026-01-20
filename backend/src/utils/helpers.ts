/**
 * General Helper Utilities
 * Common utility functions used across the application
 */

import crypto from 'crypto';

/**
 * Calculate cosine similarity between two vectors
 * Used for semantic matching of embeddings
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
};

/**
 * Convert cosine similarity to percentage score
 */
export const similarityToPercentage = (similarity: number): number => {
  // Cosine similarity ranges from -1 to 1
  // Convert to 0-100 percentage
  return Math.round(((similarity + 1) / 2) * 100);
};

/**
 * Generate a secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Sleep utility for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Truncate text to a specified length
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
};

/**
 * Sanitize string for safe storage
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
};

/**
 * Parse JSON safely with fallback
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/**
 * Calculate the match score components
 */
export const calculateMatchScore = (
  skillMatch: number,
  experienceMatch: number,
  educationMatch: number,
  keywordMatch: number
): number => {
  // Weighted scoring formula
  const weights = {
    skills: 0.40,      // 40% weight for skills matching
    experience: 0.25,  // 25% weight for experience
    education: 0.15,   // 15% weight for education
    keywords: 0.20,    // 20% weight for keywords
  };

  return Math.round(
    skillMatch * weights.skills +
    experienceMatch * weights.experience +
    educationMatch * weights.education +
    keywordMatch * weights.keywords
  );
};

/**
 * Extract file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Format bytes to human-readable size
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Generate a slug from text
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 */
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Calculate experience level from years
 */
export const getExperienceLevel = (years: number): string => {
  if (years < 1) return 'Entry Level';
  if (years < 3) return 'Junior';
  if (years < 5) return 'Mid-Level';
  if (years < 8) return 'Senior';
  if (years < 12) return 'Staff';
  return 'Principal';
};
