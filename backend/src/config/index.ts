/**
 * Application Configuration
 * Centralized configuration management using environment variables
 * All config is validated at startup to fail fast if misconfigured
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Helper function to get required env var or throw
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Helper for numeric env vars
const getNumericEnvVar = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

export const config = {
  // Server Configuration
  env: getEnvVar('NODE_ENV', 'development'),
  port: getNumericEnvVar('PORT', 5000),
  apiVersion: getEnvVar('API_VERSION', 'v1'),
  
  // Database Configuration
  database: {
    url: getEnvVar('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/resume_analyzer'),
  },
  
  // Redis Configuration
  redis: {
    host: getEnvVar('REDIS_HOST', 'localhost'),
    port: getNumericEnvVar('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  // JWT Configuration
  jwt: {
    accessSecret: getEnvVar('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessExpiry: getEnvVar('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: getEnvVar('JWT_REFRESH_EXPIRY', '7d'),
  },
  
  // Groq AI Configuration (LLM inference)
  groq: {
    apiKey: getEnvVar('GROQ_API_KEY', ''),
    model: getEnvVar('GROQ_MODEL', 'llama-3.3-70b-versatile'),
    fastModel: getEnvVar('GROQ_FAST_MODEL', 'llama-3.1-8b-instant'),
  },
  
  // Embedding Configuration (Groq doesn't provide embeddings)
  // Priority: Voyage AI > OpenAI > Local (Transformers.js)
  embedding: {
    // Voyage AI - Recommended for production
    voyageApiKey: process.env.VOYAGE_API_KEY || '',
    voyageModel: getEnvVar('VOYAGE_MODEL', 'voyage-2'),
    
    // OpenAI - Fallback option
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: getEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
    
    // Local embedding is auto-enabled if no API keys are set
  },
  
  // Legacy Gemini Configuration (kept for reference, deprecated)
  gemini: {
    apiKey: getEnvVar('GEMINI_API_KEY', ''),
    model: getEnvVar('GEMINI_MODEL', 'gemini-1.5-pro'),
    embeddingModel: getEnvVar('GEMINI_EMBEDDING_MODEL', 'text-embedding-004'),
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: getNumericEnvVar('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    uploadDir: getEnvVar('UPLOAD_DIR', './uploads'),
    allowedMimeTypes: ['application/pdf'] as string[],
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: getNumericEnvVar('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    max: getNumericEnvVar('RATE_LIMIT_MAX', 100),
  },
  
  // Logging
  logging: {
    level: getEnvVar('LOG_LEVEL', 'debug'),
  },
  
  // CORS
  cors: {
    frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:3000'),
  },
  
  // Feature flags
  features: {
    enableRedis: process.env.ENABLE_REDIS !== 'false',
    enableBullMQ: process.env.ENABLE_BULLMQ !== 'false',
  },
} as const;

// Validate critical configuration in production
if (config.env === 'production') {
  if (config.jwt.accessSecret === 'dev-access-secret-change-me') {
    throw new Error('JWT secrets must be changed in production!');
  }
  if (!config.groq.apiKey) {
    console.warn('Warning: Groq API key not configured. AI features will be disabled.');
  }
  if (!config.embedding.voyageApiKey && !config.embedding.openaiApiKey) {
    console.warn('Warning: No embedding API key configured. Using local embeddings (slower).');
  }
}

export default config;
