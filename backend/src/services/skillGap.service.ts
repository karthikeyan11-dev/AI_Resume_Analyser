/**
 * Skill Gap Service
 * Analyzes skill gaps and provides recommendations
 */

import prisma from '../config/database';
import { cache, cacheKeys } from '../config/redis';
import { openaiService } from './gemini.service';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export const skillGapService = {
  /**
   * Analyze skill gap between resume and job
   */
  async analyzeSkillGap(resumeId: string, jobId: string): Promise<any> {
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

    if (!resume || !resume.analysis) throw new NotFoundError('Resume not found');
    if (!job || !job.analysis) throw new NotFoundError('Job not found');

    const resumeSkills = resume.analysis.skills as string[];
    const requiredSkills = job.analysis.requiredSkills as string[];
    const preferredSkills = job.analysis.preferredSkills as string[];

    // Get AI analysis
    const analysis = await openaiService.analyzeSkillGap(
      resumeSkills,
      requiredSkills,
      preferredSkills,
      job.title
    );

    // Calculate priority (based on missing required skills)
    const priority = analysis.missingSkills.filter(s => s.importance === 'high').length;

    // Save to database
    const skillGap = await prisma.skillGap.upsert({
      where: { resumeId_jobId: { resumeId, jobId } },
      create: {
        resumeId,
        jobId,
        missingSkills: analysis.missingSkills,
        weakSkills: analysis.weakSkills,
        learningPath: analysis.learningPath,
        courseRecommendations: analysis.courseRecommendations,
        resumeImprovements: analysis.resumeImprovements,
        priority,
        estimatedTime: analysis.estimatedTimeToReady,
      },
      update: {
        missingSkills: analysis.missingSkills,
        weakSkills: analysis.weakSkills,
        learningPath: analysis.learningPath,
        courseRecommendations: analysis.courseRecommendations,
        resumeImprovements: analysis.resumeImprovements,
        priority,
        estimatedTime: analysis.estimatedTimeToReady,
      },
    });

    logger.info('Skill gap analyzed:', { resumeId, jobId });
    return skillGap;
  },

  /**
   * Get skill gap analysis for resume-job pair
   */
  async getSkillGap(resumeId: string, jobId: string): Promise<any> {
    let skillGap = await prisma.skillGap.findUnique({
      where: { resumeId_jobId: { resumeId, jobId } },
      include: {
        job: { select: { title: true, company: true } },
      },
    });

    if (!skillGap) {
      const newSkillGap = await this.analyzeSkillGap(resumeId, jobId);
      skillGap = await prisma.skillGap.findUnique({
        where: { id: newSkillGap.id },
        include: { job: { select: { title: true, company: true } } },
      });
    }

    return skillGap;
  },

  /**
   * Get all skill gaps for a user's resumes
   */
  async getUserSkillGaps(userId: string): Promise<any[]> {
    const skillGaps = await prisma.skillGap.findMany({
      where: { resume: { userId } },
      include: {
        resume: { select: { fileName: true } },
        job: { select: { title: true, company: true } },
      },
      orderBy: { priority: 'desc' },
    });

    return skillGaps;
  },

  /**
   * Get aggregated recommendations for a user
   */
  async getAggregatedRecommendations(userId: string): Promise<any> {
    const skillGaps = await prisma.skillGap.findMany({
      where: { resume: { userId } },
    });

    if (skillGaps.length === 0) {
      return {
        topMissingSkills: [],
        recommendedCourses: [],
        resumeImprovements: [],
      };
    }

    // Aggregate missing skills
    const skillCounts = new Map<string, number>();
    skillGaps.forEach(sg => {
      const missing = sg.missingSkills as any[];
      missing.forEach(s => {
        const count = skillCounts.get(s.skill) || 0;
        skillCounts.set(s.skill, count + (s.importance === 'high' ? 3 : s.importance === 'medium' ? 2 : 1));
      });
    });

    const topMissingSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    // Aggregate courses
    const allCourses = skillGaps.flatMap(sg => sg.courseRecommendations as any[]);
    const uniqueCourses = allCourses.reduce((acc, course) => {
      if (!acc.find((c: any) => c.courseName === course.courseName)) {
        acc.push(course);
      }
      return acc;
    }, []).slice(0, 10);

    // Aggregate resume improvements
    const allImprovements = skillGaps.flatMap(sg => sg.resumeImprovements as string[]);
    const uniqueImprovements = [...new Set(allImprovements)].slice(0, 10);

    return {
      topMissingSkills,
      recommendedCourses: uniqueCourses,
      resumeImprovements: uniqueImprovements,
    };
  },
};

export default skillGapService;
