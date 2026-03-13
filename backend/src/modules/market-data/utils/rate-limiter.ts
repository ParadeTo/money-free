/**
 * 并发控制和速率限制工具
 * 使用p-limit实现并发限制
 */

import pLimit from 'p-limit';
import { Logger } from '@nestjs/common';

const logger = new Logger('RateLimiter');

export interface RateLimiterOptions {
  concurrency?: number;
  intervalMs?: number;
  requestsPerInterval?: number;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const {
    concurrency = 3,
    intervalMs = 1000,
    requestsPerInterval = 3,
  } = options;

  const limit = pLimit(concurrency);
  let requestCount = 0;
  let windowStart = Date.now();

  return async function <T>(fn: () => Promise<T>): Promise<T> {
    return limit(async () => {
      const now = Date.now();
      const elapsed = now - windowStart;

      if (elapsed >= intervalMs) {
        requestCount = 0;
        windowStart = now;
      }

      if (requestCount >= requestsPerInterval) {
        const waitTime = intervalMs - elapsed;
        logger.debug(
          `Rate limit reached (${requestCount}/${requestsPerInterval}), waiting ${waitTime}ms`,
        );
        await sleep(waitTime);
        requestCount = 0;
        windowStart = Date.now();
      }

      requestCount++;

      try {
        return await fn();
      } catch (error) {
        throw error;
      }
    });
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
