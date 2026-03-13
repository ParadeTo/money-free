/**
 * 重试机制工具函数
 * 支持指数退避策略
 */

import { Logger } from '@nestjs/common';
import { DataSourceError, ErrorType, isRetryableError } from '../data-source/errors';

const logger = new Logger('RetryUtil');

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
};

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts) {
        break;
      }

      if (error instanceof DataSourceError && !isRetryableError(error.errorType)) {
        logger.warn(
          `Non-retryable error (${error.errorType}), stopping retry: ${error.message}`,
        );
        throw error;
      }

      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs,
      );

      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms...`,
      );

      opts.onRetry(attempt, error);

      await sleep(delay);
    }
  }

  logger.error(
    `All ${opts.maxAttempts} attempts failed for operation`,
    lastError,
  );
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
