/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard data
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

export const dashboardController = {
  /**
   * GET /dashboard/candidate
   * Get candidate dashboard data
   */
  getCandidateDashboard: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const [
      resumeCount,
      analyzedResumes,
      latestResume,
      topMatches,
      recentRecommendations,
    ] = await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.resume.count({ where: { userId, status: 'ANALYZED' } }),
      prisma.resume.findFirst({
        where: { userId, status: 'ANALYZED' },
        include: { analysis: { select: { atsScore: true, experienceLevel: true, skills: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.matchScore.findMany({
        where: { resume: { userId } },
        include: { job: { select: { title: true, company: true, location: true } } },
        orderBy: { overallScore: 'desc' },
        take: 5,
      }),
      prisma.skillGap.findMany({
        where: { resume: { userId } },
        include: { job: { select: { title: true, company: true } } },
        orderBy: { priority: 'desc' },
        take: 3,
      }),
    ]);

    sendSuccess(res, {
      stats: {
        totalResumes: resumeCount,
        analyzedResumes,
        averageAtsScore: latestResume?.analysis?.atsScore || 0,
        totalJobMatches: topMatches.length,
      },
      latestResume: latestResume ? {
        id: latestResume.id,
        fileName: latestResume.fileName,
        atsScore: latestResume.analysis?.atsScore,
        experienceLevel: latestResume.analysis?.experienceLevel,
        topSkills: (latestResume.analysis?.skills as string[])?.slice(0, 5),
      } : null,
      topJobMatches: topMatches.map(m => ({
        jobTitle: m.job.title,
        company: m.job.company,
        matchScore: m.overallScore,
        jobId: m.jobId,
      })),
      recommendations: recentRecommendations.map(r => ({
        jobTitle: r.job.title,
        company: r.job.company,
        missingSkillsCount: (r.missingSkills as any[]).length,
        priority: r.priority,
      })),
    });
  }),

  /**
   * GET /dashboard/recruiter
   * Get recruiter dashboard data
   */
  getRecruiterDashboard: asyncHandler(async (req: Request, res: Response) => {
    const recruiterId = req.user!.id;

    const [
      totalJobs,
      activeJobs,
      totalCandidates,
      shortlistedCandidates,
      recentJobs,
      topCandidates,
    ] = await Promise.all([
      prisma.job.count({ where: { recruiterId } }),
      prisma.job.count({ where: { recruiterId, status: 'ACTIVE' } }),
      prisma.matchScore.count({ where: { job: { recruiterId } } }),
      prisma.matchScore.count({ where: { job: { recruiterId }, status: 'SHORTLISTED' } }),
      prisma.job.findMany({
        where: { recruiterId },
        include: {
          analysis: { select: { requiredSkills: true } },
          _count: { select: { matchScores: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.matchScore.findMany({
        where: { job: { recruiterId }, status: { not: 'REJECTED' } },
        include: {
          resume: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              analysis: { select: { experienceLevel: true, skills: true } },
            },
          },
          job: { select: { title: true } },
        },
        orderBy: { overallScore: 'desc' },
        take: 10,
      }),
    ]);

    sendSuccess(res, {
      stats: {
        totalJobs,
        activeJobs,
        totalCandidates,
        shortlistedCandidates,
        avgMatchScore: topCandidates.length > 0
          ? Math.round(topCandidates.reduce((sum, c) => sum + c.overallScore, 0) / topCandidates.length)
          : 0,
      },
      recentJobs: recentJobs.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        status: j.status,
        candidateCount: j._count.matchScores,
        requiredSkills: (j.analysis?.requiredSkills as string[])?.slice(0, 5),
      })),
      topCandidates: topCandidates.map(c => ({
        name: `${c.resume.user.firstName} ${c.resume.user.lastName}`,
        jobTitle: c.job.title,
        matchScore: c.overallScore,
        experienceLevel: c.resume.analysis?.experienceLevel,
        status: c.status,
        matchId: c.id,
      })),
    });
  }),

  /**
   * GET /dashboard/analytics
   * Get analytics data
   */
  getAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === 'CANDIDATE') {
      // Candidate analytics
      const scoreTrends = await prisma.resume.findMany({
        where: { userId, status: 'ANALYZED' },
        include: { analysis: { select: { atsScore: true, createdAt: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      const skillProgress = await prisma.skillGap.findMany({
        where: { resume: { userId } },
        select: { createdAt: true, missingSkills: true },
        orderBy: { createdAt: 'asc' },
      });

      sendSuccess(res, {
        scoreTrends: scoreTrends.map(r => ({
          date: r.createdAt,
          score: r.analysis?.atsScore || 0,
        })),
        skillProgress: skillProgress.map(s => ({
          date: s.createdAt,
          missingCount: (s.missingSkills as any[]).length,
        })),
      });
    } else {
      // Recruiter analytics
      const matchTrends = await prisma.matchScore.groupBy({
        by: ['createdAt'],
        where: { job: { recruiterId: userId } },
        _avg: { overallScore: true },
        _count: true,
        orderBy: { createdAt: 'asc' },
        take: 30,
      });

      sendSuccess(res, {
        matchTrends: matchTrends.map(m => ({
          date: m.createdAt,
          avgScore: m._avg.overallScore,
          count: m._count,
        })),
      });
    }
  }),
};

export default dashboardController;
