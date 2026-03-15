/**
 * 优化模块的TypeScript类型定义
 */

export interface StockUpdateResult {
  stockCode: string;
  market: string;
  success: boolean;
  newRecords: number;
  reason?: 'already_latest' | 'no_new_data' | 'no_existing_data';
  error?: string;
}

export interface UpdateStats {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  totalNewRecords: number;
  byMarket: {
    [key: string]: {
      updated: number;
      alreadyLatest: number;
      noNewData: number;
      failed: number;
      newRecords: number;
    };
  };
}

export interface ProgressMetrics {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  startTime: number;
  lastUpdate: number;
  estimatedCompletion?: number;
  rate?: number; // items per minute
}

export interface ImportError {
  stockCode: string;
  market: string;
  error: string;
  errorType: 'api_error' | 'validation_error' | 'db_error' | 'rate_limit';
  timestamp: Date;
  retryResult?: 'success' | 'failed';
}

export interface DataSourceStatus {
  isAvailable: boolean;
  lastCheckTime: number;
  consecutiveFailures: number;
  lastError?: string;
}

export interface BatchWriteOptions {
  batchSize: number;
  useTransaction: boolean;
  skipDuplicates: boolean;
}

export interface RetryOptions {
  maxRetries: number;
  backoffMs: number[];
  retryableErrors: string[];
}

export interface CheckpointData {
  taskId: string;
  market: string;
  importType: 'full' | 'incremental';
  totalStocks: number;
  importedStocks: number;
  failedStocks: FailedStock[];
  status: 'running' | 'completed' | 'failed' | 'paused';
}

export interface FailedStock {
  stockCode: string;
  error: string;
  attemptCount: number;
}

export interface TaskLockInfo {
  taskId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  totalStocks: number;
  processedStocks: number;
}

export type MarketType = 'SH' | 'SZ' | 'HK' | 'US';

export type DataSourceType = 'tushare' | 'akshare' | 'yahoo_finance';

export interface KLineRecord {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface IndicatorRecord {
  date: Date;
  indicatorType: 'ma' | 'kdj' | 'rsi' | 'volume' | 'amount' | 'week52_marker';
  values: any; // JSON object specific to indicator type
}

export interface ValidationError {
  field: string;
  value: any;
  reason: string;
}

export const MARKET_TIMEZONES: Record<MarketType, string> = {
  SH: 'Asia/Shanghai',
  SZ: 'Asia/Shanghai',
  HK: 'Asia/Hong_Kong',
  US: 'America/New_York',
};

export const API_RATE_LIMITS: Record<DataSourceType, { requestsPerMinute: number; requestsPerHour: number }> = {
  tushare: { requestsPerMinute: 200, requestsPerHour: 12000 },
  akshare: { requestsPerMinute: 100, requestsPerHour: 6000 },
  yahoo_finance: { requestsPerMinute: 60, requestsPerHour: 2000 },
};

export const DEFAULT_CONCURRENCY = {
  A_STOCK: 8,
  HKUS: 3,
};

export const DEFAULT_BATCH_SIZE = 100;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BACKOFF_MS = [1000, 2000, 4000];
