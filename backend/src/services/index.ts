/**
 * Services Index
 * Export all services from a single location
 * 
 * Migrated to Groq AI from Gemini
 */

// AI Services
export { groqService, aiService } from './groq.service';
export { embeddingService } from './embedding.service';

// Legacy Gemini exports (deprecated - for backward compatibility)
export { geminiService, openaiService } from './gemini.service';

// Core Services
export { authService } from './auth.service';
export { resumeService } from './resume.service';
export { jobService } from './job.service';
export { matchingService } from './matching.service';
export { skillGapService } from './skillGap.service';

// New Services
export { pdfExtractionService } from './pdfExtraction.service';
export { jobProgressService } from './jobProgress.service';
export { reportService } from './report.service';

