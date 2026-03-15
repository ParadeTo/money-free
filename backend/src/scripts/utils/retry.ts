/**
 * 重试策略工具函数
 */

import { RetryOptions } from '../types/optimization';

/**
 * 睡眠函数
 * @param ms 毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查错误是否为速率限制错误
 * @param error 错误对象
 * @returns 是否为速率限制错误
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || '';
  const statusCode = error.statusCode || error.status || error.response?.status;
  
  return (
    statusCode === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('限流') ||
    message.includes('频率限制')
  );
}

/**
 * 检查错误是否可重试
 * @param error 错误对象
 * @returns 是否可重试
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || '';
  const code = error.code || error.errno;
  
  // 网络错误
  const networkErrors = [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
  ];
  
  if (networkErrors.includes(code)) {
    return true;
  }
  
  // HTTP临时错误
  const statusCode = error.statusCode || error.status || error.response?.status;
  if (statusCode >= 500 && statusCode < 600) {
    return true; // 5xx服务器错误
  }
  
  if (statusCode === 408 || statusCode === 429 || statusCode === 503) {
    return true; // 特定的可重试状态码
  }
  
  // 超时错误
  if (message.includes('timeout') || message.includes('超时')) {
    return true;
  }
  
  return false;
}

/**
 * 使用指数退避策略重试函数
 * @param fn 要执行的函数
 * @param options 重试选项
 * @returns 函数执行结果
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000],
    retryableErrors: [],
  },
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // 检查是否为速率限制错误
      if (isRateLimitError(error)) {
        console.warn(`⚠️ API速率限制,暂停60秒...`);
        await sleep(60000);
        continue;
      }
      
      // 最后一次尝试失败
      if (attempt === options.maxRetries) {
        throw error;
      }
      
      // 检查是否可重试
      if (!isRetryableError(error)) {
        throw error; // 不可重试的错误直接抛出
      }
      
      // 计算退避时间
      const backoffMs = options.backoffMs[Math.min(attempt, options.backoffMs.length - 1)];
      console.warn(`⚠️ 重试 ${attempt + 1}/${options.maxRetries},等待 ${backoffMs}ms: ${error.message}`);
      await sleep(backoffMs);
    }
  }
  
  throw lastError!;
}

/**
 * 带主备数据源的重试函数
 * @param primaryFn 主数据源函数
 * @param fallbackFn 备用数据源函数
 * @param options 重试选项
 * @returns 函数执行结果
 */
export async function fetchWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000],
    retryableErrors: [],
  },
): Promise<{ data: T; source: 'primary' | 'fallback' }> {
  try {
    const data = await retryWithBackoff(primaryFn, options);
    return { data, source: 'primary' };
  } catch (primaryError: any) {
    console.warn(`⚠️ 主数据源失败,切换到备用数据源: ${primaryError.message}`);
    
    try {
      const data = await retryWithBackoff(fallbackFn, { ...options, maxRetries: 1 });
      return { data, source: 'fallback' };
    } catch (fallbackError: any) {
      console.error(`❌ 主备数据源均失败`);
      throw new Error(
        `主数据源错误: ${primaryError.message}; 备用数据源错误: ${fallbackError.message}`,
      );
    }
  }
}
