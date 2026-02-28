/**
 * 数据更新相关类型定义
 */

export type UpdateStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface UpdateProgress {
  total: number;
  current: number;
  success: number;
  failed: number;
  percentage: number;
}

export interface UpdateStatusResponse {
  taskId: string;
  status: UpdateStatus;
  progress: UpdateProgress;
  startedAt: string;
  completedAt?: string;
  message?: string;
}

export interface ErrorDetail {
  stockCode: string;
  stockName?: string;
  error: string;
  timestamp: string;
}

export interface UpdateLog {
  id: string;
  taskId: string;
  status: UpdateStatus;
  stocksUpdated: number;
  successCount: number;
  failedCount: number;
  errorDetails: ErrorDetail[];
  startedAt: string;
  completedAt: string;
  duration: number;
}

export interface UpdateHistoryItem {
  id: string;
  taskId: string;
  status: UpdateStatus;
  stocksUpdated: number;
  successCount: number;
  failedCount: number;
  startedAt: string;
  completedAt?: string;
}

export interface TriggerUpdateResponse {
  taskId: string;
  message: string;
}
