/**
 * Report Service
 * Generates comprehensive resume analysis reports
 * 
 * Features:
 * - Full job match report with all matched roles
 * - Detailed skill gap analysis per role
 * - AI-generated improvement suggestions
 * - Market trend-aware recommendations
 * - Aggregated insights across all matches
 */

import prisma from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { groqService } from './groq.service';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export interface MatchedJob {
  jobId: string;
  title: string;
  company: string;
  location?: string;
  jobType?: string;
  overallScore: number;
  skillMatchScore: number;
  experienceScore: number;
  educationScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchExplanation?: string;
  skillGap?: {
    missingSkills: Array<{ skill: string; importance: string; description: string }>;
    weakSkills: Array<{ skill: string; currentLevel: string; requiredLevel: string }>;
    learningPath: Array<{ skill: string; resources: string[]; estimatedTime: string; priority: number }>;
    courseRecommendations: Array<{ skill: string; courseName: string; provider: string }>;
  };
}

export interface ResumeReport {
  resumeId: string;
  fileName: string;
  uploadedAt: Date;
  analyzedAt?: Date;
  
  // Resume Analysis Summary
  analysis: {
    skills: string[];
    experienceLevel: string;
    totalYearsExperience: number;
    atsScore: number;
    atsIssues: string[];
    atsSuggestions: string[];
    summary: string;
    contactInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    certifications: string[];
    languages: string[];
    educationSummary: string;
    experienceSummary: string;
  };
  
  // All matched jobs ranked by score
  matchedJobs: MatchedJob[];
  totalMatches: number;
  
  // Aggregated insights
  insights: {
    topMatchingRoles: string[];
    mostCommonMissingSkills: Array<{ skill: string; frequency: number }>;
    suggestedSkillsToLearn: string[];
    overallMarketFit: 'Excellent' | 'Good' | 'Moderate' | 'Needs Improvement';
    marketFitScore: number;
    improvementPriorities: string[];
  };
  
  // AI-generated recommendations
  recommendations: {
    immediateActions: string[];
    shortTermGoals: string[];
    longTermGoals: string[];
    marketTrends: string[];
  };
  
  generatedAt: Date;
}

/**
 * Calculate overall market fit based on match scores
 */
function calculateMarketFit(scores: number[]): { 
  label: 'Excellent' | 'Good' | 'Moderate' | 'Needs Improvement';
  score: number;
} {
  if (scores.length === 0) {
    return { label: 'Needs Improvement', score: 0 };
  }
  
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const topScores = scores.slice(0, 5);
  const topAvg = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  
  // Weighted: 60% top matches, 40% overall average
  const weightedScore = (topAvg * 0.6) + (avgScore * 0.4);
  
  let label: 'Excellent' | 'Good' | 'Moderate' | 'Needs Improvement';
  if (weightedScore >= 80) label = 'Excellent';
  else if (weightedScore >= 65) label = 'Good';
  else if (weightedScore >= 50) label = 'Moderate';
  else label = 'Needs Improvement';
  
  return { label, score: Math.round(weightedScore) };
}

/**
 * Aggregate missing skills across all matches
 */
function aggregateMissingSkills(
  matches: Array<{ missingSkills: string[] }>
): Array<{ skill: string; frequency: number }> {
  const skillCounts = new Map<string, number>();
  
  for (const match of matches) {
    for (const skill of match.missingSkills) {
      const normalized = skill.toLowerCase();
      skillCounts.set(normalized, (skillCounts.get(normalized) || 0) + 1);
    }
  }
  
  return Array.from(skillCounts.entries())
    .map(([skill, frequency]) => ({ skill, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

export const reportService = {
  /**
   * Generate a comprehensive report for a resume
   */
  async generateFullReport(
    resumeId: string,
    userId: string,
    options?: { forceRefresh?: boolean; includeSkillGaps?: boolean }
  ): Promise<ResumeReport> {
    const cacheKey = `report:full:${resumeId}`;
    
    // Check cache first (unless forced refresh)
    if (!options?.forceRefresh) {
      const cached = await cache.get<ResumeReport>(cacheKey);
      if (cached) {
        logger.debug('Returning cached report', { resumeId });
        return cached;
      }
    }

    // Get resume with analysis
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        analysis: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!resume) {
      throw new NotFoundError('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new NotFoundError('Resume not found');
    }

    if (!resume.analysis) {
      throw new NotFoundError('Resume has not been analyzed yet');
    }

    // Get all match scores for this resume
    const matchScores = await prisma.matchScore.findMany({
      where: { resumeId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            jobType: true,
            description: true,
          },
        },
      },
      orderBy: { overallScore: 'desc' },
    });

    // Get skill gaps if requested
    const skillGaps = options?.includeSkillGaps
      ? await prisma.skillGap.findMany({
          where: { resumeId },
        })
      : [];

    // Build skill gap lookup
    const skillGapLookup = new Map(
      skillGaps.map(sg => [sg.jobId, sg])
    );

    // Build matched jobs array
    const matchedJobs: MatchedJob[] = matchScores.map(match => ({
      jobId: match.jobId,
      title: match.job.title,
      company: match.job.company,
      location: match.job.location || undefined,
      jobType: match.job.jobType || undefined,
      overallScore: Math.round(match.overallScore),
      skillMatchScore: Math.round(match.skillMatchScore),
      experienceScore: Math.round(match.experienceScore),
      educationScore: Math.round(match.educationScore),
      matchedSkills: match.matchedSkills as string[],
      missingSkills: match.missingSkills as string[],
      matchExplanation: match.matchExplanation || undefined,
      skillGap: skillGapLookup.has(match.jobId)
        ? {
            missingSkills: skillGapLookup.get(match.jobId)!.missingSkills as any[],
            weakSkills: skillGapLookup.get(match.jobId)!.weakSkills as any[],
            learningPath: skillGapLookup.get(match.jobId)!.learningPath as any[],
            courseRecommendations: skillGapLookup.get(match.jobId)!.courseRecommendations as any[],
          }
        : undefined,
    }));

    // Calculate insights
    const scores = matchedJobs.map(m => m.overallScore);
    const marketFit = calculateMarketFit(scores);
    const missingSkillsAggregated = aggregateMissingSkills(matchedJobs);
    
    // Get top matching role titles
    const topMatchingRoles = matchedJobs
      .slice(0, 5)
      .map(m => m.title);

    // Generate AI recommendations
    const recommendations = await this.generateRecommendations(
      resume.analysis,
      matchedJobs.slice(0, 10),
      missingSkillsAggregated
    );

    // Build the report
    const report: ResumeReport = {
      resumeId,
      fileName: resume.fileName,
      uploadedAt: resume.createdAt,
      analyzedAt: resume.analyzedAt || undefined,
      
      analysis: {
        skills: resume.analysis.skills as string[],
        experienceLevel: resume.analysis.experienceLevel || 'Unknown',
        totalYearsExperience: resume.analysis.totalYearsExp || 0,
        atsScore: resume.analysis.atsScore,
        atsIssues: resume.analysis.atsIssues as string[],
        atsSuggestions: resume.analysis.atsSuggestions as string[],
        summary: resume.analysis.summary || '',
        contactInfo: resume.analysis.contactInfo as any,
        certifications: resume.analysis.certifications as string[],
        languages: resume.analysis.languages as string[],
        educationSummary: resume.analysis.educationSummary || '',
        experienceSummary: resume.analysis.experienceSummary || '',
      },
      
      matchedJobs,
      totalMatches: matchedJobs.length,
      
      insights: {
        topMatchingRoles,
        mostCommonMissingSkills: missingSkillsAggregated,
        suggestedSkillsToLearn: missingSkillsAggregated.slice(0, 5).map(s => s.skill),
        overallMarketFit: marketFit.label,
        marketFitScore: marketFit.score,
        improvementPriorities: recommendations.immediateActions.slice(0, 3),
      },
      
      recommendations,
      generatedAt: new Date(),
    };

    // Cache the report for 1 hour
    await cache.set(cacheKey, JSON.stringify(report), 3600);

    logger.info('Full report generated', { 
      resumeId, 
      totalMatches: matchedJobs.length,
      marketFit: marketFit.label 
    });

    return report;
  },

  /**
   * Generate AI-powered recommendations based on matches
   */
  async generateRecommendations(
    analysis: any,
    topMatches: MatchedJob[],
    missingSkills: Array<{ skill: string; frequency: number }>
  ): Promise<ResumeReport['recommendations']> {
    try {
      const prompt = `Based on the following resume analysis and job matches, provide career recommendations.

RESUME SUMMARY:
- Experience Level: ${analysis.experienceLevel}
- Years of Experience: ${analysis.totalYearsExp}
- ATS Score: ${analysis.atsScore}%
- Current Skills: ${(analysis.skills as string[]).slice(0, 15).join(', ')}

TOP JOB MATCHES:
${topMatches.slice(0, 5).map(m => `- ${m.title} at ${m.company}: ${m.overallScore}% match`).join('\n')}

MOST COMMONLY MISSING SKILLS:
${missingSkills.slice(0, 5).map(s => `- ${s.skill} (missing in ${s.frequency} job matches)`).join('\n')}

Provide recommendations in this JSON format:
{
  "immediateActions": ["3-5 actions to take this week"],
  "shortTermGoals": ["3-5 goals for the next 1-3 months"],
  "longTermGoals": ["3-5 goals for the next 6-12 months"],
  "marketTrends": ["3-5 relevant market trends or insights"]
}

Focus on actionable, specific advice tailored to this candidate's profile.`;

      const result = await groqService.analyzeResume(prompt);
      
      // The response might be parsed incorrectly, so we handle it
      if (typeof result === 'object' && 'immediateActions' in result) {
        return result as any;
      }
      
      // Fallback to default recommendations
      return this.getDefaultRecommendations(missingSkills);
    } catch (error) {
      logger.warn('Failed to generate AI recommendations, using defaults', { error });
      return this.getDefaultRecommendations(missingSkills);
    }
  },

  /**
   * Get default recommendations when AI is unavailable
   */
  getDefaultRecommendations(
    missingSkills: Array<{ skill: string; frequency: number }>
  ): ResumeReport['recommendations'] {
    const topSkills = missingSkills.slice(0, 3).map(s => s.skill);
    
    return {
      immediateActions: [
        'Update your resume with quantifiable achievements',
        'Optimize your LinkedIn profile to match your resume',
        `Consider learning: ${topSkills[0] || 'in-demand skills for your field'}`,
        'Apply to your highest-matched jobs first',
      ],
      shortTermGoals: [
        `Build proficiency in ${topSkills.join(', ') || 'key missing skills'}`,
        'Complete 2-3 relevant online certifications',
        'Expand your professional network in target industries',
        'Create a portfolio showcasing your best projects',
      ],
      longTermGoals: [
        'Develop expertise in emerging technologies in your field',
        'Build thought leadership through content or speaking',
        'Mentor others to strengthen your leadership skills',
        'Consider advanced certifications or education',
      ],
      marketTrends: [
        'AI and automation skills are increasingly in demand',
        'Remote work experience is valued by many employers',
        'Soft skills like communication are differentiators',
        'Continuous learning is expected in most tech roles',
      ],
    };
  },

  /**
   * Get a summary version of the report (for list views)
   */
  async getReportSummary(resumeId: string, userId: string): Promise<{
    resumeId: string;
    fileName: string;
    atsScore: number;
    totalMatches: number;
    topMatchScore: number;
    marketFit: string;
    analyzedAt?: Date;
  }> {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        analysis: { select: { atsScore: true } },
        matchScores: {
          select: { overallScore: true },
          orderBy: { overallScore: 'desc' },
          take: 1,
        },
        _count: { select: { matchScores: true } },
      },
    });

    if (!resume || resume.userId !== userId) {
      throw new NotFoundError('Resume not found');
    }

    const topMatch = resume.matchScores[0]?.overallScore || 0;
    const marketFit = calculateMarketFit([topMatch]);

    return {
      resumeId,
      fileName: resume.fileName,
      atsScore: resume.analysis?.atsScore || 0,
      totalMatches: resume._count.matchScores,
      topMatchScore: Math.round(topMatch),
      marketFit: marketFit.label,
      analyzedAt: resume.analyzedAt || undefined,
    };
  },

  /**
   * Invalidate cached report
   */
  async invalidateReport(resumeId: string): Promise<void> {
    await cache.del(`report:full:${resumeId}`);
    logger.debug('Report cache invalidated', { resumeId });
  },
};

export default reportService;
