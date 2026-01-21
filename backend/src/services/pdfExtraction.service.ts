/**
 * PDF Extraction Service
 * Robust text extraction pipeline supporting:
 * - Text-based PDFs (standard extraction)
 * - Image-based PDFs (OCR fallback)
 * - LaTeX-generated PDFs (special handling)
 * - Mixed content PDFs (hybrid approach)
 * 
 * Uses multiple extraction strategies with quality validation
 * 
 * Note: OCR features require optional dependencies:
 * - tesseract.js (for OCR)
 * - pdf2pic (for PDF to image conversion)
 */

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { config } from '../config';
import { FileProcessingError } from '../utils/errors';
import logger from '../utils/logger';

// OCR dependencies are optional - loaded dynamically
let Tesseract: any = null;
let pdf2pic: any = null;

// Try to load optional OCR dependencies
const loadOCRDependencies = async (): Promise<boolean> => {
  try {
    // @ts-ignore - Optional dependency
    Tesseract = await import('tesseract.js');
    // @ts-ignore - Optional dependency
    pdf2pic = await import('pdf2pic');
    return true;
  } catch (error) {
    logger.debug('OCR dependencies not available, OCR will be disabled');
    return false;
  }
};


// Extraction quality thresholds
const MIN_TEXT_LENGTH = 50;
const MIN_WORD_COUNT = 20;
const GIBBERISH_PATTERN = /[^\x20-\x7E\n\r\t]/g; // Non-printable chars
const MAX_GIBBERISH_RATIO = 0.3; // Max 30% non-standard chars

interface ExtractionResult {
  text: string;
  method: 'text' | 'ocr' | 'hybrid';
  confidence: number;
  pageCount: number;
  warnings: string[];
}

interface ExtractionOptions {
  enableOCR?: boolean;
  ocrLanguage?: string;
  maxPages?: number;
  cleanText?: boolean;
}

const DEFAULT_OPTIONS: ExtractionOptions = {
  enableOCR: true,
  ocrLanguage: 'eng',
  maxPages: 20,
  cleanText: true,
};

/**
 * Clean and normalize extracted text
 * Handles LaTeX artifacts, encoding issues, and formatting
 */
function cleanExtractedText(text: string): string {
  let cleaned = text
    // Remove common LaTeX artifacts
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // \command{arg}
    .replace(/\\[a-zA-Z]+/g, '') // \command
    .replace(/\$[^$]+\$/g, '') // Math mode
    .replace(/\{|\}/g, '') // Braces
    
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    
    // Remove control characters but keep newlines
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Fix common encoding issues
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€"/g, '-')
    .replace(/â€¢/g, '•')
    .replace(/Â /g, ' ')
    
    // Normalize quotes and dashes
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    
    // Remove excessive whitespace
    .trim();

  return cleaned;
}

/**
 * Validate extraction quality
 * Returns a confidence score 0-1
 */
function assessExtractionQuality(text: string): { confidence: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 1.0;

  // Check text length
  if (text.length < MIN_TEXT_LENGTH) {
    score -= 0.4;
    warnings.push('Extracted text is very short');
  }

  // Check word count
  const wordCount = text.split(/\s+/).filter(w => w.length > 1).length;
  if (wordCount < MIN_WORD_COUNT) {
    score -= 0.3;
    warnings.push(`Low word count: ${wordCount}`);
  }

  // Check for gibberish (encoding issues)
  const gibberishMatches = text.match(GIBBERISH_PATTERN) || [];
  const gibberishRatio = gibberishMatches.length / Math.max(text.length, 1);
  if (gibberishRatio > MAX_GIBBERISH_RATIO) {
    score -= 0.3;
    warnings.push('High proportion of unrecognized characters');
  }

  // Check for common resume indicators
  const resumeIndicators = [
    /experience/i,
    /education/i,
    /skills?/i,
    /work|employment/i,
    /email|phone|contact/i,
  ];
  const indicatorMatches = resumeIndicators.filter(p => p.test(text)).length;
  if (indicatorMatches < 2) {
    score -= 0.2;
    warnings.push('Missing typical resume sections');
  }

  return {
    confidence: Math.max(0, Math.min(1, score)),
    warnings,
  };
}

/**
 * Extract text using standard PDF parsing
 * Works best for text-based PDFs
 */
async function extractTextDirect(filePath: string): Promise<{ text: string; pageCount: number }> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  
  return {
    text: data.text || '',
    pageCount: data.numpages || 1,
  };
}

/**
 * Extract text using OCR
 * For image-based or scanned PDFs
 * Requires optional dependencies: tesseract.js, pdf2pic
 */
async function extractTextOCR(
  filePath: string, 
  options: ExtractionOptions
): Promise<{ text: string; pageCount: number }> {
  // Check if OCR dependencies are available
  const ocrAvailable = await loadOCRDependencies();
  if (!ocrAvailable || !Tesseract || !pdf2pic) {
    throw new FileProcessingError('OCR dependencies not installed. Install tesseract.js and pdf2pic for OCR support.');
  }

  const tempDir = path.join(config.upload.uploadDir, 'temp_ocr');
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const baseOptions = {
    density: 300, // Higher DPI for better OCR
    saveFilename: `ocr_${Date.now()}`,
    savePath: tempDir,
    format: 'png',
    width: 2480, // A4 at 300 DPI
    height: 3508,
  };

  try {
    // Convert PDF pages to images using dynamically loaded pdf2pic
    const { fromPath } = pdf2pic;
    const convert = fromPath(filePath, baseOptions);
    
    // Get page count first
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    const pageCount = Math.min(pdfData.numpages, options.maxPages || 20);

    const textParts: string[] = [];

    // Process each page
    for (let page = 1; page <= pageCount; page++) {
      logger.debug(`OCR processing page ${page}/${pageCount}`);
      
      const result = await convert(page, { responseType: 'image' });
      const imagePath = result.path;

      if (imagePath && fs.existsSync(imagePath)) {
        // Run OCR on the image using dynamically loaded Tesseract
        const ocrResult = await Tesseract.recognize(imagePath, options.ocrLanguage || 'eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        textParts.push(ocrResult.data.text);

        // Clean up temp image
        fs.unlinkSync(imagePath);
      }
    }

    return {
      text: textParts.join('\n\n'),
      pageCount,
    };
  } catch (error) {
    logger.error('OCR extraction failed:', { error, filePath });
    throw new FileProcessingError('OCR extraction failed');
  } finally {
    // Clean up temp directory
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          if (file.startsWith('ocr_')) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        }
      }
    } catch (cleanupError) {
      logger.warn('Failed to clean up OCR temp files:', { cleanupError });
    }
  }
}

/**
 * Main extraction function with fallback strategies
 */
export const pdfExtractionService = {
  /**
   * Extract text from PDF with automatic method selection
   */
  async extractText(filePath: string, options?: Partial<ExtractionOptions>): Promise<ExtractionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const warnings: string[] = [];

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new FileProcessingError(`File not found: ${filePath}`);
    }

    logger.info('Starting PDF extraction', { filePath });

    // Step 1: Try direct text extraction
    let directResult: { text: string; pageCount: number };
    try {
      directResult = await extractTextDirect(filePath);
      logger.debug('Direct extraction result', { 
        textLength: directResult.text.length,
        pageCount: directResult.pageCount 
      });
    } catch (error) {
      logger.warn('Direct extraction failed, will try OCR', { error });
      directResult = { text: '', pageCount: 0 };
    }

    // Clean the text
    let cleanedText = opts.cleanText ? cleanExtractedText(directResult.text) : directResult.text;
    
    // Assess quality
    let quality = assessExtractionQuality(cleanedText);
    warnings.push(...quality.warnings);

    // Step 2: If quality is poor and OCR is enabled, try OCR
    if (quality.confidence < 0.5 && opts.enableOCR) {
      logger.info('Low quality text extraction, attempting OCR');
      
      try {
        const ocrResult = await extractTextOCR(filePath, opts);
        const ocrCleaned = opts.cleanText ? cleanExtractedText(ocrResult.text) : ocrResult.text;
        const ocrQuality = assessExtractionQuality(ocrCleaned);

        // Use OCR result if it's better
        if (ocrQuality.confidence > quality.confidence) {
          logger.info('OCR produced better results, using OCR text');
          cleanedText = ocrCleaned;
          quality = ocrQuality;
          warnings.push('Used OCR for extraction');

          return {
            text: cleanedText,
            method: 'ocr',
            confidence: quality.confidence,
            pageCount: ocrResult.pageCount,
            warnings,
          };
        }

        // Hybrid: combine both if neither is great
        if (quality.confidence < 0.7 && ocrQuality.confidence > 0.3) {
          logger.info('Using hybrid extraction (text + OCR)');
          cleanedText = `${cleanedText}\n\n--- Additional OCR Content ---\n\n${ocrCleaned}`;
          quality.confidence = Math.max(quality.confidence, ocrQuality.confidence);
          warnings.push('Used hybrid text + OCR extraction');

          return {
            text: cleanedText,
            method: 'hybrid',
            confidence: quality.confidence,
            pageCount: Math.max(directResult.pageCount, ocrResult.pageCount),
            warnings,
          };
        }
      } catch (ocrError) {
        logger.warn('OCR fallback failed:', { ocrError });
        warnings.push('OCR fallback failed');
      }
    }

    // Return text extraction result
    return {
      text: cleanedText,
      method: 'text',
      confidence: quality.confidence,
      pageCount: directResult.pageCount,
      warnings,
    };
  },

  /**
   * Quick check if a PDF is likely image-based
   * Useful for deciding whether to use OCR upfront
   */
  async isImageBasedPDF(filePath: string): Promise<boolean> {
    try {
      const result = await extractTextDirect(filePath);
      const quality = assessExtractionQuality(result.text);
      return quality.confidence < 0.3;
    } catch {
      return true; // Assume image-based if we can't read it
    }
  },

  /**
   * Get extraction quality assessment without full processing
   */
  assessQuality(text: string): { confidence: number; warnings: string[] } {
    return assessExtractionQuality(text);
  },

  /**
   * Clean text without full extraction
   */
  cleanText(text: string): string {
    return cleanExtractedText(text);
  },
};

export default pdfExtractionService;
