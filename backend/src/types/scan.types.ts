/**
 * 成交量激增扫描器 - 共享类型定义
 * Feature: 008-volume-surge-scan
 */

export enum ScanMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum ScanStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface VolumePattern {
  contractionPeriod: {
    startDate: Date;
    endDate: Date;
    avgVolume: number;
  };
  expansionPoint: {
    date: Date;
    volume: number;
    multiplier: number;
    days: number;
  };
}

export interface MovingAverageTrend {
  ma50: number;
  ma150: number;
  ma50Slope: number;
  isTrendingUp: boolean;
  ma50BelowMa150: boolean;
}

export interface VolumeSupport {
  upDayAvgVolume: number;
  downDayAvgVolume: number;
  ratio: number;
}

export interface ScanCriteria {
  meetsVolumeCriteria: boolean;
  meetsMaCriteria: boolean;
  meetsSupportCriteria: boolean;
  meetsAllCriteria: boolean;
}

export interface StockScanResult {
  stockCode: string;
  stockName?: string;
  volumePattern: VolumePattern;
  volumeSupport: VolumeSupport;
  movingAverages: MovingAverageTrend;
  criteria: ScanCriteria;
}

export interface ScanRequest {
  mode: ScanMode;
  referenceDate?: string;
  source?: 'web' | 'cli';
}

export interface ScanProgress {
  scanId: string;
  status: ScanStatus;
  totalStocks: number;
  processedStocks: number;
  matchedStocks: number;
  currentStock?: string;
  progress: number;
}

export interface ScanSummary {
  scanId: string;
  scanDate: Date;
  scanMode: ScanMode;
  referenceDate?: Date;
  status: ScanStatus;
  totalStocks: number;
  matchedStocks: number;
  unmatchedStocks: number;
  durationMs?: number;
  createdBy?: string;
}

export interface ScanResultDetail extends StockScanResult {
  resultId: string;
  scanId: string;
  createdAt: Date;
}

export interface CompareRequest {
  scanId1: string;
  scanId2: string;
}

export interface PersistentStock {
  stockCode: string;
  stockName: string;
  volumeSupportRatio1: number;
  volumeSupportRatio2: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface CompareResult {
  scan1: ScanSummary;
  scan2: ScanSummary;
  persistentStocks: PersistentStock[];
  summary: {
    persistentCount: number;
    onlyInScan1: number;
    onlyInScan2: number;
  };
}
