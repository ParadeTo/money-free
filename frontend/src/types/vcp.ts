export interface VcpScanItem {
  stockCode: string;
  stockName: string;
  latestPrice: number;
  priceChangePct: number;
  distFrom52WeekHigh: number;
  distFrom52WeekLow: number;
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
  rsRating: number;
  inPullback: boolean;
  pullbackCount: number;
  lastPullback?: Pullback;
}

export interface VcpScanResponse {
  stocks: VcpScanItem[];
  totalCount: number;
  scanDate: string;
}

export interface VcpScanQuery {
  sortBy?: 'contractionCount' | 'lastContractionPct' | 'volumeDryingUp' | 'rsRating' | 'priceChangePct';
  sortOrder?: 'asc' | 'desc';
  inPullbackOnly?: boolean;
}

export interface TrendTemplateCheck {
  name: string;
  label: string;
  pass: boolean;
  currentValue: number;
  threshold: number;
}

export interface Contraction {
  index: number;
  swingHighDate: string;
  swingHighPrice: number;
  swingLowDate: string;
  swingLowPrice: number;
  depthPct: number;
  durationDays: number;
  avgVolume: number;
}

/**
 * VCP Analysis complete result (for single stock analysis)
 */
export interface VcpAnalysis {
  stockCode: string;
  stockName: string;
  scanDate: string;
  cached: boolean;
  isExpired: boolean;
  hasVcp: boolean;
  summary: VcpSummary;
  contractions: Contraction[];
  pullbacks: PullbackWithStatus[];
  klines: KLineData[];
  trendTemplate: TrendTemplate;
}

/**
 * VCP Summary
 */
export interface VcpSummary {
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
  rsRating: number;
  inPullback: boolean;
  pullbackCount: number;
  latestPrice: number;
  priceChangePct: number;
  distFrom52WeekHigh: number;
  distFrom52WeekLow: number;
}

/**
 * Pullback with daysSinceLow status
 */
export interface PullbackWithStatus {
  index: number;
  highDate: string;
  highPrice: number;
  lowDate: string;
  lowPrice: number;
  pullbackPct: number;
  durationDays: number;
  avgVolume: number;
  isInUptrend: boolean;
  daysSinceLow: number;
}

/**
 * K-Line data with changePct
 */
export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number;
}

/**
 * Trend template check
 */
export interface TrendTemplateCheckResult {
  name: string;
  pass: boolean;
  description?: string;
}

/**
 * Trend template
 */
export interface TrendTemplate {
  pass: boolean;
  checks: TrendTemplateCheckResult[];
}

export interface Pullback {
  index: number;
  highDate: string;
  highPrice: number;
  lowDate: string;
  lowPrice: number;
  pullbackPct: number;
  durationDays: number;
  avgVolume: number;
  isInUptrend: boolean;
}

export interface VcpDetailResponse {
  stockCode: string;
  stockName: string;
  scanDate: string;
  trendTemplate: {
    allPass: boolean;
    checks: TrendTemplateCheck[];
  };
  contractions: Contraction[];
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
  rsRating: number;
  pullbacks?: Pullback[];
}

// Early Stage Filter Types
export interface FilterConditions {
  distFrom52WeekLow: number;
  distFrom52WeekHigh: number;
  contractionCountMin: number;
  contractionCountMax: number;
}

export enum VcpStage {
  CONTRACTION = 'contraction',
  IN_PULLBACK = 'in_pullback',
  PULLBACK_ENDED = 'pullback_ended',
}

export interface PullbackInfo {
  durationDays: number;
  pullbackPct: number;
  highPrice: number;
  lowPrice: number;
  highDate: string;
  lowDate: string;
  daysSinceLow: number;
  recoveryPct: number;
}

export interface EarlyStageStock {
  stockCode: string;
  stockName: string;
  latestPrice: number;
  priceChangePct: number;
  distFrom52WeekHigh: number;
  distFrom52WeekLow: number;
  contractionCount: number;
  lastContractionPct: number;
  rsRating: number;
  volumeDryingUp: boolean;
  vcpStage: VcpStage;
  pullbackInfo?: PullbackInfo;
}

export interface QuickAction {
  label: string;
  adjustments: Partial<FilterConditions>;
}

export interface ResultTip {
  type: 'warning' | 'info' | 'error';
  message: string;
  suggestedActions: QuickAction[];
}

export interface FilterEarlyStageResponse {
  stocks: EarlyStageStock[];
  total: number;
  appliedConditions: FilterConditions;
  tip?: ResultTip;
}

export const DEFAULT_FILTER_CONDITIONS: FilterConditions = {
  distFrom52WeekLow: 50,   // Increased to 50% to include more early-stage stocks
  distFrom52WeekHigh: 10,  // Decreased from 30% to 10%, matching actual VCP characteristics
  contractionCountMin: 3,
  contractionCountMax: 4,
};
