/**
 * 数据源错误类型定义
 * 用于数据源适配器的统一错误处理
 */

export enum ErrorType {
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

export class DataSourceError extends Error {
  constructor(
    public readonly source: 'akshare' | 'yahoo_finance',
    public readonly errorType: ErrorType,
    public readonly originalError: any,
    message: string,
  ) {
    super(message);
    this.name = 'DataSourceError';
    Object.setPrototypeOf(this, DataSourceError.prototype);
  }
}

export function isRetryableError(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK_TIMEOUT,
    ErrorType.RATE_LIMIT,
    ErrorType.SERVICE_UNAVAILABLE,
  ].includes(errorType);
}
