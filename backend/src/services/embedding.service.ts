/**
 * Embedding Service
 * Handles text embedding generation for semantic similarity matching
 * 
 * Since Groq doesn't provide embeddings, we use alternatives:
 * - Primary: Voyage AI (high-quality, cost-effective)
 * - Fallback: OpenAI embeddings
 * - Local: Transformers.js (for development/testing)
 * 
 * The service abstracts the embedding provider, making it easy to switch.
 */

import { config } from '../config';
import { AIProcessingError } from '../utils/errors';
import { retryWithBackoff } from '../utils/helpers';
import logger from '../utils/logger';

// Embedding dimensions for different providers
const EMBEDDING_DIMENSIONS = {
  voyage: 1024,      // voyage-2
  openai: 1536,      // text-embedding-3-small
  local: 384,        // all-MiniLM-L6-v2
} as const;

type EmbeddingProvider = 'voyage' | 'openai' | 'local';

// API Response types
interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

/**
 * Get embedding using Voyage AI
 * High-quality embeddings optimized for retrieval
 */
async function getVoyageEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.embedding.voyageApiKey}`,
    },
    body: JSON.stringify({
      input: text.slice(0, 8000), // Voyage has token limits
      model: config.embedding.voyageModel,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AIProcessingError(`Voyage AI error: ${error}`);
  }

  const data = await response.json() as VoyageEmbeddingResponse;
  return data.data[0].embedding;
}

/**
 * Get embedding using OpenAI
 * Reliable fallback with proven quality
 */
async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.embedding.openaiApiKey}`,
    },
    body: JSON.stringify({
      input: text.slice(0, 8000),
      model: config.embedding.openaiModel,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AIProcessingError(`OpenAI embedding error: ${error}`);
  }

  const data = await response.json() as OpenAIEmbeddingResponse;
  return data.data[0].embedding;
}

/**
 * Get embedding using local computation (Transformers.js)
 * Good for development/testing without API costs
 * NOTE: Requires @xenova/transformers package
 */
async function getLocalEmbedding(text: string): Promise<number[]> {
  try {
    // Dynamic import to avoid loading heavy ML libraries when not needed
    // @ts-ignore - @xenova/transformers is an optional dependency
    const transformers = await import('@xenova/transformers');
    const { pipeline } = transformers;
    
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor(text.slice(0, 512), { pooling: 'mean', normalize: true });
    
    return Array.from(output.data as number[]);
  } catch (error) {
    logger.error('Local embedding failed:', { error });
    throw new AIProcessingError('Local embedding model not available. Install @xenova/transformers or configure Voyage/OpenAI API key');
  }
}

/**
 * Determine which embedding provider to use based on configuration
 */
function getActiveProvider(): EmbeddingProvider {
  if (config.embedding.voyageApiKey) {
    return 'voyage';
  }
  if (config.embedding.openaiApiKey) {
    return 'openai';
  }
  return 'local';
}

export const embeddingService = {
  /**
   * Generate embedding for text
   * Automatically selects the best available provider
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const provider = getActiveProvider();
    
    logger.debug('Generating embedding', { provider, textLength: text.length });

    return retryWithBackoff(async () => {
      switch (provider) {
        case 'voyage':
          return await getVoyageEmbedding(text);
        case 'openai':
          return await getOpenAIEmbedding(text);
        case 'local':
          return await getLocalEmbedding(text);
        default:
          throw new AIProcessingError('No embedding provider configured');
      }
    }, 3);
  },

  /**
   * Generate embeddings for multiple texts (batch processing)
   * More efficient than individual calls for some providers
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const provider = getActiveProvider();

    if (provider === 'voyage' && config.embedding.voyageApiKey) {
      // Voyage supports batch embeddings
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.embedding.voyageApiKey}`,
        },
        body: JSON.stringify({
          input: texts.map(t => t.slice(0, 8000)),
          model: config.embedding.voyageModel,
        }),
      });

      if (!response.ok) {
        throw new AIProcessingError('Voyage batch embedding failed');
      }

      const data = await response.json() as VoyageEmbeddingResponse;
      return data.data.map((d) => d.embedding);
    }

    // Fallback: sequential processing
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  },

  /**
   * Get the dimension of embeddings for the active provider
   * Useful for database schema validation
   */
  getEmbeddingDimension(): number {
    const provider = getActiveProvider();
    return EMBEDDING_DIMENSIONS[provider];
  },

  /**
   * Get the currently active embedding provider
   */
  getActiveProvider(): EmbeddingProvider {
    return getActiveProvider();
  },

  /**
   * Health check for embedding service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testEmbedding = await this.generateEmbedding('test');
      return testEmbedding.length > 0;
    } catch (error) {
      logger.error('Embedding health check failed:', { error });
      return false;
    }
  },
};

export default embeddingService;
