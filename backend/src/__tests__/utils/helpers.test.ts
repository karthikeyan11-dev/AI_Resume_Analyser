/**
 * Helper Utils Unit Tests
 */

import {
  cosineSimilarity,
  similarityToPercentage,
  calculateMatchScore,
  generateSecureToken,
  truncateText,
  sanitizeString,
  safeJsonParse,
  getExperienceLevel,
  isEmpty,
  formatFileSize,
} from '../../utils/helpers';

describe('Helper Utils', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
    });

    it('should return -1 for opposite vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1);
    });

    it('should throw error for different length vectors', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
    });
  });

  describe('similarityToPercentage', () => {
    it('should convert 1 to 100%', () => {
      expect(similarityToPercentage(1)).toBe(100);
    });

    it('should convert 0 to 50%', () => {
      expect(similarityToPercentage(0)).toBe(50);
    });

    it('should convert -1 to 0%', () => {
      expect(similarityToPercentage(-1)).toBe(0);
    });
  });

  describe('calculateMatchScore', () => {
    it('should calculate weighted score correctly', () => {
      const score = calculateMatchScore(80, 70, 60, 90);
      // 80*0.4 + 70*0.25 + 60*0.15 + 90*0.2 = 32 + 17.5 + 9 + 18 = 76.5
      expect(score).toBe(77); // Rounded
    });

    it('should handle all zeros', () => {
      expect(calculateMatchScore(0, 0, 0, 0)).toBe(0);
    });

    it('should handle all 100s', () => {
      expect(calculateMatchScore(100, 100, 100, 100)).toBe(100);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(32); // hex encoding doubles the length
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with suffix', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should use custom suffix', () => {
      expect(truncateText('Hello World', 9, '…')).toBe('Hello Wo…');
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"key": "value"}', {})).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      expect(safeJsonParse('not json', { default: true })).toEqual({ default: true });
    });
  });

  describe('getExperienceLevel', () => {
    it('should return Entry Level for < 1 year', () => {
      expect(getExperienceLevel(0.5)).toBe('Entry Level');
    });

    it('should return Junior for 1-3 years', () => {
      expect(getExperienceLevel(2)).toBe('Junior');
    });

    it('should return Mid-Level for 3-5 years', () => {
      expect(getExperienceLevel(4)).toBe('Mid-Level');
    });

    it('should return Senior for 5-8 years', () => {
      expect(getExperienceLevel(6)).toBe('Senior');
    });

    it('should return Staff for 8-12 years', () => {
      expect(getExperienceLevel(10)).toBe('Staff');
    });

    it('should return Principal for 12+ years', () => {
      expect(getExperienceLevel(15)).toBe('Principal');
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ key: 'value' })).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500.0 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });
  });
});
