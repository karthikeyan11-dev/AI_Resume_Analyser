/**
 * Gemini AI Service
 * Handles all AI-related operations using Google Gemini API including:
 * - Resume parsing and analysis
 * - Job description analysis
 * - Embeddings generation for semantic matching
 * - Skill gap analysis and recommendations
 * 
 * Migrated from OpenAI to Google Gemini (gemini-1.5-pro)
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
  GenerationConfig,
} from '@google/generative-ai';
import { config } from '../config';
import { AIProcessingError } from '../utils/errors';
import { retryWithBackoff } from '../utils/helpers';
import logger from '../utils/logger';

// Initialize Google Generative AI client
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let embeddingModel: GenerativeModel | null = null;

const initializeGemini = (): void => {
  if (!config.gemini.apiKey) {
    logger.warn('Gemini API key not configured. AI features will be disabled.');
    return;
  }

  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  
  // Initialize the main model with safety settings
  model = genAI.getGenerativeModel({
    model: config.gemini.model,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  // Initialize embedding model
  embeddingModel = genAI.getGenerativeModel({
    model: config.gemini.embeddingModel,
  });

  logger.info('Gemini AI initialized successfully');
};

// Initialize on module load
initializeGemini();

// Type definitions for AI responses (preserved from original)
interface ResumeAnalysisResult {
  skills: string[];
  experienceSummary: string;
  totalYearsExperience: number;
  experienceLevel: string;
  educationSummary: string;
  highestDegree: string;
  atsScore: number;
  atsIssues: string[];
  atsSuggestions: string[];
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  certifications: string[];
  languages: string[];
  summary: string;
}

interface JobAnalysisResult {
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number;
  maxExperience: number;
  experienceLevel: string;
  requiredEducation: string;
  keywords: string[];
  responsibilities: string[];
  benefits: string[];
}

interface SkillGapResult {
  missingSkills: Array<{
    skill: string;
    importance: 'high' | 'medium' | 'low';
    description: string;
  }>;
  weakSkills: Array<{
    skill: string;
    currentLevel: string;
    requiredLevel: string;
  }>;
  learningPath: Array<{
    skill: string;
    resources: string[];
    estimatedTime: string;
    priority: number;
  }>;
  courseRecommendations: Array<{
    skill: string;
    courseName: string;
    provider: string;
    url?: string;
  }>;
  resumeImprovements: string[];
  estimatedTimeToReady: string;
}

/**
 * System prompts for consistent AI behavior
 * Adapted for Gemini's system instruction format
 */
const SYSTEM_PROMPTS = {
  resumeAnalysis: `You are an expert resume analyzer and ATS (Applicant Tracking System) specialist. 
Your job is to extract structured information from resumes and provide ATS compatibility scores.
Always respond with valid JSON only, no markdown formatting or code blocks.
Extract skills accurately, including both technical and soft skills.
Be realistic with ATS scores - consider formatting, keywords, and content quality.`,

  jobAnalysis: `You are an expert job description analyzer and HR specialist.
Your job is to extract structured requirements and expectations from job descriptions.
Always respond with valid JSON only, no markdown formatting or code blocks.
Distinguish between required and preferred/nice-to-have qualifications.`,

  skillGap: `You are a career development expert and learning path advisor.
Your job is to identify skill gaps between a candidate's profile and job requirements,
then provide actionable recommendations for improvement.
Always respond with valid JSON only, no markdown formatting or code blocks.
Prioritize recommendations based on job requirements and market demand.`,

  matchExplanation: `You are a professional recruiter providing candidate evaluation summaries. 
Be concise and objective. Provide clear, actionable insights.`,
};

/**
 * Generation config for JSON responses
 */
const jsonGenerationConfig: GenerationConfig = {
  temperature: 0.3,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4096,
  responseMimeType: 'application/json',
};

/**
 * Generation config for text responses
 */
const textGenerationConfig: GenerationConfig = {
  temperature: 0.5,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 500,
};

/**
 * Safe JSON parsing with validation
 */
const parseAIResponse = <T>(response: string, validator?: (data: unknown) => data is T): T => {
  try {
    // Extract JSON from possible markdown code blocks
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Clean up any remaining markdown artifacts
    jsonStr = jsonStr.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?/, '').replace(/```$/, '');
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    if (validator && !validator(parsed)) {
      throw new Error('Response validation failed');
    }
    
    return parsed as T;
  } catch (error) {
    logger.error('Failed to parse AI response:', { response: response.substring(0, 500), error });
    throw new AIProcessingError('Failed to parse AI response');
  }
};

/**
 * Generate content using Gemini with system instruction
 */
const generateContent = async (
  systemPrompt: string,
  userPrompt: string,
  generationConfig: GenerationConfig = jsonGenerationConfig
): Promise<string> => {
  if (!model) {
    throw new AIProcessingError('Gemini API not initialized');
  }

  const chat = model.startChat({
    generationConfig,
    history: [
      {
        role: 'user',
        parts: [{ text: `System Instructions: ${systemPrompt}` }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions precisely and respond with properly formatted output.' }],
      },
    ],
  });

  const result = await chat.sendMessage(userPrompt);
  const response = result.response;
  
  if (!response) {
    throw new AIProcessingError('No response received from Gemini');
  }

  const text = response.text();
  
  if (!text) {
    throw new AIProcessingError('Empty response from Gemini');
  }

  return text;
};

// Export service with same interface as openaiService for drop-in replacement
export const geminiService = {
  /**
   * Analyze a resume and extract structured data
   */
  async analyzeResume(resumeText: string): Promise<ResumeAnalysisResult> {
    if (!config.gemini.apiKey) {
      throw new AIProcessingError('Gemini API key not configured');
    }

    const prompt = `Analyze the following resume and extract structured information.

RESUME TEXT:
${resumeText}

Respond with a JSON object containing:
{
  "skills": ["array of all skills - technical, soft, tools, frameworks"],
  "experienceSummary": "brief summary of work experience",
  "totalYearsExperience": number (estimate total years of professional experience),
  "experienceLevel": "Entry Level | Junior | Mid-Level | Senior | Staff | Principal",
  "educationSummary": "summary of educational background",
  "highestDegree": "highest degree obtained (e.g., Bachelor's, Master's, PhD, High School)",
  "atsScore": number 0-100 (ATS compatibility score),
  "atsIssues": ["list of ATS compatibility issues found"],
  "atsSuggestions": ["list of suggestions to improve ATS score"],
  "contactInfo": {
    "name": "candidate name if found",
    "email": "email if found",
    "phone": "phone if found",
    "location": "location if found"
  },
  "certifications": ["list of certifications"],
  "languages": ["list of languages known"],
  "summary": "professional summary or objective extracted or generated"
}

Be accurate and thorough. Only include information that can be reasonably extracted or inferred.`;

    const result = await retryWithBackoff(async () => {
      return await generateContent(SYSTEM_PROMPTS.resumeAnalysis, prompt);
    }, 3);

    logger.debug('Resume analysis completed');
    return parseAIResponse<ResumeAnalysisResult>(result);
  },

  /**
   * Analyze a job description and extract requirements
   */
  async analyzeJobDescription(jobDescription: string, jobTitle: string): Promise<JobAnalysisResult> {
    if (!config.gemini.apiKey) {
      throw new AIProcessingError('Gemini API key not configured');
    }

    const prompt = `Analyze the following job description for the position of "${jobTitle}".

JOB DESCRIPTION:
${jobDescription}

Respond with a JSON object containing:
{
  "requiredSkills": ["skills that are explicitly required or mandatory"],
  "preferredSkills": ["skills that are nice-to-have or preferred"],
  "minExperience": number (minimum years of experience required, 0 if entry-level),
  "maxExperience": number (maximum years, or null if no upper limit),
  "experienceLevel": "Entry Level | Junior | Mid-Level | Senior | Staff | Principal | Lead",
  "requiredEducation": "minimum education requirement",
  "keywords": ["important keywords for ATS matching"],
  "responsibilities": ["key job responsibilities"],
  "benefits": ["listed benefits and perks"]
}

Extract information accurately. If something is not specified, use reasonable defaults based on the role.`;

    const result = await retryWithBackoff(async () => {
      return await generateContent(SYSTEM_PROMPTS.jobAnalysis, prompt);
    }, 3);

    logger.debug('Job analysis completed');
    return parseAIResponse<JobAnalysisResult>(result);
  },

  /**
   * Generate embeddings for semantic similarity matching
   * Uses Gemini's embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!config.gemini.apiKey) {
      throw new AIProcessingError('Gemini API key not configured');
    }

    if (!embeddingModel) {
      throw new AIProcessingError('Gemini embedding model not initialized');
    }

    // Truncate text if too long (Gemini embedding has token limits)
    const truncatedText = text.slice(0, 8000);

    const result = await retryWithBackoff(async () => {
      const embeddingResult = await embeddingModel!.embedContent(truncatedText);
      return embeddingResult.embedding.values;
    }, 3);

    logger.debug('Embedding generated', { textLength: truncatedText.length });
    return result;
  },

  /**
   * Analyze skill gaps and generate recommendations
   */
  async analyzeSkillGap(
    resumeSkills: string[],
    jobRequiredSkills: string[],
    jobPreferredSkills: string[],
    jobTitle: string
  ): Promise<SkillGapResult> {
    if (!config.gemini.apiKey) {
      throw new AIProcessingError('Gemini API key not configured');
    }

    const prompt = `Analyze the skill gap between a candidate and a job opening for "${jobTitle}".

CANDIDATE SKILLS:
${resumeSkills.join(', ')}

REQUIRED JOB SKILLS:
${jobRequiredSkills.join(', ')}

PREFERRED JOB SKILLS:
${jobPreferredSkills.join(', ')}

Respond with a JSON object containing:
{
  "missingSkills": [
    {
      "skill": "skill name",
      "importance": "high | medium | low",
      "description": "why this skill is important for the role"
    }
  ],
  "weakSkills": [
    {
      "skill": "skill the candidate has but may need to strengthen",
      "currentLevel": "estimated current level",
      "requiredLevel": "required level for the job"
    }
  ],
  "learningPath": [
    {
      "skill": "skill to learn",
      "resources": ["suggested learning resources"],
      "estimatedTime": "estimated time to learn (e.g., '2-4 weeks')",
      "priority": 1-5 (1 being highest priority)
    }
  ],
  "courseRecommendations": [
    {
      "skill": "skill",
      "courseName": "recommended course name",
      "provider": "course provider (e.g., Coursera, Udemy, LinkedIn Learning)"
    }
  ],
  "resumeImprovements": ["specific suggestions to improve the resume for this role"],
  "estimatedTimeToReady": "estimated time to become a strong candidate"
}

Be realistic and actionable. Prioritize based on job requirements.`;

    const result = await retryWithBackoff(async () => {
      return await generateContent(SYSTEM_PROMPTS.skillGap, prompt);
    }, 3);

    logger.debug('Skill gap analysis completed');
    return parseAIResponse<SkillGapResult>(result);
  },

  /**
   * Generate a match explanation between a resume and job
   */
  async generateMatchExplanation(
    resumeSummary: string,
    resumeSkills: string[],
    jobTitle: string,
    jobRequirements: string[],
    matchScore: number
  ): Promise<string> {
    if (!config.gemini.apiKey) {
      return `Match score: ${matchScore}%. This is an automated match based on skill alignment.`;
    }

    const prompt = `Generate a brief, professional explanation for why a candidate matches (or doesn't match) a job opening.

JOB TITLE: ${jobTitle}
JOB REQUIREMENTS: ${jobRequirements.join(', ')}

CANDIDATE SUMMARY: ${resumeSummary}
CANDIDATE SKILLS: ${resumeSkills.join(', ')}

MATCH SCORE: ${matchScore}%

Provide a 2-3 sentence explanation of the match, highlighting key strengths and potential gaps.`;

    try {
      const result = await generateContent(
        SYSTEM_PROMPTS.matchExplanation,
        prompt,
        textGenerationConfig
      );

      return result.trim() || `Match score: ${matchScore}%`;
    } catch (error) {
      logger.error('Failed to generate match explanation:', { error });
      return `Match score: ${matchScore}%. Analysis based on skill and experience alignment.`;
    }
  },

  /**
   * Check if Gemini API is configured and working
   */
  async healthCheck(): Promise<boolean> {
    if (!config.gemini.apiKey) {
      return false;
    }

    try {
      if (!model) {
        initializeGemini();
      }
      
      // Test with a simple prompt
      const result = await model!.generateContent('Respond with: OK');
      const text = result.response.text();
      
      return text.includes('OK');
    } catch (error) {
      logger.error('Gemini health check failed:', { error });
      return false;
    }
  },
};

// Export as default and named exports for compatibility
export const openaiService = geminiService; // Alias for backward compatibility
export default geminiService;
