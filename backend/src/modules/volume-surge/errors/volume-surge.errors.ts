export enum VolumeSurgeErrorCode {
  SCAN_NOT_FOUND = 'SCAN_NOT_FOUND',
  SCAN_ALREADY_RUNNING = 'SCAN_ALREADY_RUNNING',
  SCAN_FAILED = 'SCAN_FAILED',
  SCAN_CANCELLED = 'SCAN_CANCELLED',
  INVALID_SCAN_MODE = 'INVALID_SCAN_MODE',
  INVALID_REFERENCE_DATE = 'INVALID_REFERENCE_DATE',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  EXPORT_FAILED = 'EXPORT_FAILED',
  COMPARE_FAILED = 'COMPARE_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class VolumeSurgeError extends Error {
  constructor(
    public readonly code: VolumeSurgeErrorCode,
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'VolumeSurgeError';
  }
}

export const VolumeSurgeErrorMessages: Record<VolumeSurgeErrorCode, string> = {
  [VolumeSurgeErrorCode.SCAN_NOT_FOUND]: '扫描记录不存在',
  [VolumeSurgeErrorCode.SCAN_ALREADY_RUNNING]: '扫描任务已在运行中',
  [VolumeSurgeErrorCode.SCAN_FAILED]: '扫描执行失败',
  [VolumeSurgeErrorCode.SCAN_CANCELLED]: '扫描已被取消',
  [VolumeSurgeErrorCode.INVALID_SCAN_MODE]: '无效的扫描模式',
  [VolumeSurgeErrorCode.INVALID_REFERENCE_DATE]: '无效的参考日期',
  [VolumeSurgeErrorCode.INSUFFICIENT_DATA]: 'K线数据不足',
  [VolumeSurgeErrorCode.EXPORT_FAILED]: '导出失败',
  [VolumeSurgeErrorCode.COMPARE_FAILED]: '对比失败',
  [VolumeSurgeErrorCode.DATABASE_ERROR]: '数据库操作失败',
};
