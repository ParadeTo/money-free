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
      jest.useFakeTimers();

      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.statusCode = 429;

      const fn = jest.fn().mockRejectedValue(rateLimitError);

      // Start the retry (maxRetries=1 means 2 total attempts: attempt 0 and attempt 1)
      // Each rate-limit hit sleeps 60s before continuing; the loop exhausts after 2 fn() calls
      let resolvedError: any;
      const promise = retryWithBackoff(fn, {
        maxRetries: 1,
        backoffMs: [10],
        retryableErrors: [],
      }).catch((err) => { resolvedError = err; });

      // Advance time past both 60s sleeps
      await jest.advanceTimersByTimeAsync(60000);
      await jest.advanceTimersByTimeAsync(60000);

      // Wait for any remaining microtasks to settle
      await promise;

      expect(resolvedError).toBeDefined();
      expect(resolvedError.message).toBe('Rate limit exceeded');
      // fn is called once per loop attempt: attempt 0 and attempt 1
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
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
