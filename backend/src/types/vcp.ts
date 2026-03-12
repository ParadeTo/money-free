/**
 * VCP Analysis Types
 * 
 * Shared type definitions for VCP analysis across backend services.
 */

/**
 * VCP Analysis complete result
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
  pullbacks: Pullback[];
  klines: KLine[];
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
 * Contraction phase
 */
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
 * Pullback phase
 */
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
  daysSinceLow: number;
}

/**
 * K-Line data
 */
export interface KLine {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number;
}

/**
 * Trend template check result
 */
export interface TrendTemplateCheck {
  name: string;
  pass: boolean;
  description?: string;
}

/**
 * Trend template
 */
export interface TrendTemplate {
  pass: boolean;
  checks: TrendTemplateCheck[];
}
