/**
 * Matching Service
 * Handles resume-job matching with semantic similarity scoring
 * 
 * Updated to use Groq AI for match explanations
 */

import prisma from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { groqService } from './groq.service';
import { NotFoundError } from '../utils/errors';
import { cosineSimilarity, calculateMatchScore, getExperienceLevel } from '../utils/helpers';
import { calculatePagination } from '../utils/response';
import logger from '../utils/logger';

interface MatchResult {
  jobId: string;
  jobTitle: string;
  company: string;
  overallScore: number;
  skillMatchScore: number;
  experienceScore: number;
  educationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export const matchingService = {
  /**
   * Calculate match score between a resume and job
   */
  async calculateMatch(resumeId: string, jobId: string): Promise<any> {
    const [resume, job] = await Promise.all([
      prisma.resume.findUnique({
        where: { id: resumeId },
        include: { analysis: true },
      }),
      prisma.job.findUnique({
        where: { id: jobId },
        include: { analysis: true },
      }),
    ]);

    if (!resume || !resume.analysis) throw new NotFoundError('Resume or analysis not found');
    if (!job || !job.analysis) throw new NotFoundError('Job or analysis not found');

    // Calculate semantic similarity using embeddings
    const skillSimilarity = cosineSimilarity(
      resume.analysis.skillsEmbedding as number[],
      job.analysis.skillsEmbedding as number[]
    );

    // Calculate skill match (direct comparison)
    const resumeSkills = (resume.analysis.skills as string[]).map(s => s.toLowerCase());
    const requiredSkills = (job.analysis.requiredSkills as string[]).map(s => s.toLowerCase());
    const preferredSkills = (job.analysis.preferredSkills as string[]).map(s => s.toLowerCase());

    const matchedRequired = requiredSkills.filter(s => 
      resumeSkills.some(rs => rs.includes(s) || s.includes(rs))
    );
    const matchedPreferred = preferredSkills.filter(s => 
      resumeSkills.some(rs => rs.includes(s) || s.includes(rs))
    );
    const missingSkills = requiredSkills.filter(s => 
      !resumeSkills.some(rs => rs.includes(s) || s.includes(rs))
    );

    const skillMatchScore = requiredSkills.length > 0
      ? (matchedRequired.length / requiredSkills.length) * 100
      : 50;

    // Experience score
    const candidateYears = resume.analysis.totalYearsExp || 0;
    const minExp = job.analysis.minExperience || 0;
    const maxExp = job.analysis.maxExperience || 20;

    let experienceScore = 100;
    if (candidateYears < minExp) {
      experienceScore = Math.max(0, 100 - (minExp - candidateYears) * 15);
    } else if (candidateYears > maxExp) {
      experienceScore = Math.max(50, 100 - (candidateYears - maxExp) * 5);
    }

    // Education score (simplified)
    const educationScore = resume.analysis.highestDegree ? 80 : 60;

    // Keyword score from semantic similarity
    const keywordScore = Math.round(((skillSimilarity + 1) / 2) * 100);

    // Calculate overall score
    const overallScore = calculateMatchScore(
      skillMatchScore,
      experienceScore,
      educationScore,
      keywordScore
    );

    // Generate match explanation
    const explanation = await groqService.generateMatchExplanation(
      resume.analysis.summary || '',
      resumeSkills,
      job.title,
      requiredSkills,
      overallScore
    );

    // Save or update match score
    const matchScore = await prisma.matchScore.upsert({
      where: { resumeId_jobId: { resumeId, jobId } },
      create: {
        resumeId,
        jobId,
        overallScore,
        skillMatchScore,
        experienceScore,
        educationScore,
        keywordScore,
        matchedSkills: [...matchedRequired, ...matchedPreferred],
        missingSkills,
        matchExplanation: explanation,
        status: 'CALCULATED',
      },
      update: {
        overallScore,
        skillMatchScore,
        experienceScore,
        educationScore,
        keywordScore,
        matchedSkills: [...matchedRequired, ...matchedPreferred],
        missingSkills,
        matchExplanation: explanation,
        status: 'CALCULATED',
      },
    });

    await cache.del(cacheKeys.matchScore(resumeId, jobId));
    logger.info('Match calculated:', { resumeId, jobId, score: overallScore });

    return matchScore;
  },

  /**
   * Get matching jobs for a resume
   */
  async getMatchingJobs(
    resumeId: string,
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ matches: any[]; total: number }> {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: { analysis: true },
    });

    if (!resume || resume.userId !== userId) throw new NotFoundError('Resume not found');
    if (!resume.analysis) throw new NotFoundError('Resume not analyzed yet');

    const { skip, take } = calculatePagination(page, limit);

    // Get active jobs with analysis
    const jobs = await prisma.job.findMany({
      where: { status: 'ACTIVE', analysis: { isNot: null } },
      include: { analysis: true },
    });

    // Calculate scores for all jobs (or get existing)
    const matchPromises = jobs.map(async (job) => {
      let match = await prisma.matchScore.findUnique({
        where: { resumeId_jobId: { resumeId, jobId: job.id } },
      });

      if (!match) {
        match = await this.calculateMatch(resumeId, job.id);
      }

      return { job, match };
    });

    const results = await Promise.all(matchPromises);

    // Sort by score and paginate
    results.sort((a, b) => (b.match?.overallScore || 0) - (a.match?.overallScore || 0));
    const paginated = results.slice(skip, skip + take);

    return {
      matches: paginated.map(r => ({
        ...r.match,
        job: {
          id: r.job.id,
          title: r.job.title,
          company: r.job.company,
          location: r.job.location,
          jobType: r.job.jobType,
        },
      })),
      total: results.length,
    };
  },

  /**
   * Get matching candidates for a job
   */
  async getMatchingCandidates(
    jobId: string,
    recruiterId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ matches: any[]; total: number }> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { analysis: true },
    });

    if (!job || job.recruiterId !== recruiterId) throw new NotFoundError('Job not found');
    if (!job.analysis) throw new NotFoundError('Job not analyzed yet');

    const { skip, take } = calculatePagination(page, limit);

    // Get analyzed resumes
    const resumes = await prisma.resume.findMany({
      where: { status: 'ANALYZED', analysis: { isNot: null } },
      include: { analysis: true, user: { select: { firstName: true, lastName: true, email: true } } },
    });

    // Calculate scores
    const matchPromises = resumes.map(async (resume) => {
      let match = await prisma.matchScore.findUnique({
        where: { resumeId_jobId: { resumeId: resume.id, jobId } },
      });

      if (!match) {
        match = await this.calculateMatch(resume.id, jobId);
      }

      return { resume, match };
    });

    const results = await Promise.all(matchPromises);
    results.sort((a, b) => (b.match?.overallScore || 0) - (a.match?.overallScore || 0));
    const paginated = results.slice(skip, skip + take);

    return {
      matches: paginated.map(r => ({
        ...r.match,
        candidate: {
          id: r.resume.userId,
          name: `${r.resume.user.firstName} ${r.resume.user.lastName}`,
          email: r.resume.user.email,
          resumeId: r.resume.id,
          experienceLevel: r.resume.analysis?.experienceLevel,
          skills: (r.resume.analysis?.skills as string[])?.slice(0, 10),
        },
      })),
      total: results.length,
    };
  },

  /**
   * Update match status (shortlist/reject)
   */
  async updateMatchStatus(
    matchId: string,
    status: 'SHORTLISTED' | 'REJECTED'
  ): Promise<any> {
    const match = await prisma.matchScore.update({
      where: { id: matchId },
      data: {
        status,
        shortlistedAt: status === 'SHORTLISTED' ? new Date() : null,
      },
    });

    logger.info('Match status updated:', { matchId, status });
    return match;
  },

  /**
   * Calculate matches for a resume against all active jobs
   * Used to populate job matches after resume analysis
   */
  async calculateMatchesForResume(
    resumeId: string,
    userId: string
  ): Promise<{ matchCount: number; matches: any[] }> {
    // Verify resume belongs to user
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: { analysis: true },
    });

    if (!resume || !resume.analysis) {
      throw new NotFoundError('Resume not found or not analyzed');
    }

    // Get all active jobs with analysis
    const activeJobs = await prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        analysis: { isNot: null },
      },
      include: { analysis: true },
      take: 50, // Limit to prevent overload
    });

    if (activeJobs.length === 0) {
      return { matchCount: 0, matches: [] };
    }

    // Calculate matches for each job
    const matches: any[] = [];
    
    for (const job of activeJobs) {
      try {
        // Check if match already exists
        const existingMatch = await prisma.matchScore.findUnique({
          where: { resumeId_jobId: { resumeId, jobId: job.id } },
        });

        if (existingMatch) {
          matches.push(existingMatch);
          continue;
        }

        // Calculate new match
        const match = await this.calculateMatch(resumeId, job.id);
        matches.push(match);
      } catch (error) {
        logger.warn('Failed to calculate match:', { resumeId, jobId: job.id, error });
      }
    }

    logger.info('Calculated matches for resume:', { resumeId, matchCount: matches.length });

    return {
      matchCount: matches.length,
      matches: matches.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0)),
    };
  },
};

export default matchingService;

