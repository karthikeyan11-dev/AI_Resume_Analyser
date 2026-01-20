/**
 * Validation Schemas using Zod
 * Centralized validation for all input data
 */

import { z } from 'zod';

// ============================================
// AUTH VALIDATIONS
// ============================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum(['CANDIDATE', 'RECRUITER']).optional().default('CANDIDATE'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// USER VALIDATIONS
// ============================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
});

// ============================================
// JOB VALIDATIONS
// ============================================

export const createJobSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(200),
  company: z.string().min(1, 'Company name is required').max(200),
  location: z.string().max(200).optional(),
  salary: z.string().max(100).optional(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']).optional(),
  description: z.string().min(50, 'Description must be at least 50 characters'),
});

export const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
});

// ============================================
// RESUME VALIDATIONS
// ============================================

export const resumeUploadSchema = z.object({
  file: z.object({
    mimetype: z.string().refine(
      (val) => val === 'application/pdf',
      'Only PDF files are allowed'
    ),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  }),
});

// ============================================
// MATCHING VALIDATIONS
// ============================================

export const matchJobsSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID'),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export const matchCandidatesSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export const shortlistCandidateSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  status: z.enum(['SHORTLISTED', 'REJECTED']),
});

// ============================================
// PAGINATION VALIDATIONS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================
// ID VALIDATIONS
// ============================================

export const uuidSchema = z.string().uuid('Invalid ID format');

// Type exports for use in controllers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
