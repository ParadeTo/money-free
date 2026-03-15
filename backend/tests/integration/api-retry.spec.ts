/**
 * API重试机制测试
 */

import { retryWithBackoff, fetchWithFallback, isRetryableError, isRateLimitError } from '../../src/scripts/utils/retry';

describe('API Retry Mechanism', () => {
  describe('retryWithBackoff', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Network timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        backoffMs: [10, 20, 40],
        retryableErrors: [],
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      
      const fn = async () => {
        attempts++;
        throw new Error('Invalid API key');
      };

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 3,
          backoffMs: [10, 20, 40],
          retryableErrors: [],
        })
      ).rejects.toThrow('Invalid API key');

      expect(attempts).toBe(1);
    });

    it('should handle rate limit errors with extended wait', async () => {
      const fn = jest.fn().mockRejectedValue({
        message: 'Rate limit exceeded',
        statusCode: 429,
      });

      const startTime = Date.now();
      
      await expect(
        retryWithBackoff(fn, {
          maxRetries: 1,
          backoffMs: [10],
          retryableErrors: [],
        })
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(59000); // Should wait ~60 seconds
    }, 65000);
  });

  describe('fetchWithFallback', () => {
    it('should use primary source if successful', async () => {
      const primaryFn = jest.fn().mockResolvedValue({ data: 'primary' });
      const fallbackFn = jest.fn().mockResolvedValue({ data: 'fallback' });

      const result = await fetchWithFallback(primaryFn, fallbackFn, {
        maxRetries: 1,
        backoffMs: [10],
        retryableErrors: [],
      });

      expect(result).toEqual({ data: { data: 'primary' }, source: 'primary' });
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should fallback to secondary source if primary fails', async () => {
      const primaryFn = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ data: 'fallback' });

      const result = await fetchWithFallback(primaryFn, fallbackFn, {
        maxRetries: 1,
        backoffMs: [10],
        retryableErrors: [],
      });

      expect(result).toEqual({ data: { data: 'fallback' }, source: 'fallback' });
    });
  });

  describe('error detection', () => {
    it('should detect rate limit errors', () => {
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
      expect(isRateLimitError({ message: 'rate limit exceeded' })).toBe(true);
      expect(isRateLimitError({ message: 'too many requests' })).toBe(true);
    });

    it('should detect retryable errors', () => {
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ statusCode: 503 })).toBe(true);
      expect(isRetryableError({ message: 'timeout' })).toBe(true);
    });
  });
});
