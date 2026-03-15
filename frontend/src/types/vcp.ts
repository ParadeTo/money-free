export interface VcpScanItem {
  stockCode: string;
  stockName: string;
  market?: 'SH' | 'SZ' | 'HK' | 'US';
  currency?: 'CNY' | 'HKD' | 'USD';
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
  maxPullbackPct?: number;
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
  market: 'SH' | 'SZ' | 'HK' | 'US';
  currency: 'CNY' | 'HKD' | 'USD';
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
  market?: 'SH' | 'SZ' | 'HK' | 'US';
  currency?: 'CNY' | 'HKD' | 'USD';
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

// ============================================================================
// VCP Overlay Layer Types (for Chart Visualization)
// ============================================================================

/**
 * Point coordinate (date + price)
 */
export interface VcpPoint {
  /** Date (ISO string) */
  date: string;
  /** Price */
  price: number;
}

/**
 * VCP line visualization data (unified format for contractions and pullbacks)
 */
export interface VcpLineData {
  /** Unique identifier */
  id: string;
  
  /** Line type */
  type: 'contraction' | 'pullback';
  
  /** Index number (C1, C2... or P1, P2...) */
  index: number;
  
  /** Start point (high point) */
  startPoint: VcpPoint;
  
  /** End point (low point) */
  endPoint: VcpPoint;
  
  /** Depth percentage (positive number) */
  depthPercent: number;
  
  /** Duration in days */
  durationDays: number;
  
  /** Average volume */
  avgVolume: number;
  
  /** Status (for pullback only) */
  status?: 'active' | 'completed';
  
  /** Pullback specific: days since low */
  daysSinceLow?: number;
  
  /** Pullback specific: is in uptrend */
  isInUptrend?: boolean;
}

/**
 * VCP line visual style
 */
export interface VcpLineStyle {
  /** Line color (hex) */
  color: string;
  
  /** Line width (pixels) */
  lineWidth: number;
  
  /** Dash pattern [solid length, gap length] */
  dashArray: [number, number];
  
  /** Opacity (0-1) */
  opacity: number;
}

/**
 * Predefined style constants
 */
export const VCP_LINE_STYLES: Record<string, VcpLineStyle> = {
  contraction: {
    color: '#2563eb',     // Deep cyan-blue
    lineWidth: 2,
    dashArray: [8, 4],    // 8px solid, 4px gap
    opacity: 0.8,
  },
  pullbackCompleted: {
    color: '#f59e0b',     // Amber-orange
    lineWidth: 2,
    dashArray: [5, 5],    // 5px solid, 5px gap
    opacity: 0.7,
  },
  pullbackActive: {
    color: '#fb923c',     // Bright orange
    lineWidth: 2,
    dashArray: [5, 5],
    opacity: 0.9,
  },
};

/**
 * VCP marker point (swing high/low dots)
 */
export interface VcpMarkerData {
  /** Unique identifier */
  id: string;
  
  /** Marker type */
  type: 'swing-high' | 'swing-low';
  
  /** Associated line ID */
  lineId: string;
  
  /** Position */
  point: VcpPoint;
  
  /** Marker color (inherited from line) */
  color: string;
  
  /** Radius (pixels) */
  radius: number;
}

/**
 * VCP line label (displayed at midpoint)
 */
export interface VcpLabelData {
  /** Unique identifier */
  id: string;
  
  /** Associated line ID */
  lineId: string;
  
  /** Display text (e.g., "C1: 7.5%") */
  text: string;
  
  /** Label position (line midpoint) */
  position: VcpPoint;
  
  /** Label color (inherited from line) */
  color: string;
  
  /** Font size */
  fontSize: number;
  
  /** Semi-transparent background */
  backgroundColor: string;
}

/**
 * VCP Tooltip content structure
 */
export interface VcpTooltipContent {
  title: string;                  // "Contraction #1" or "Pullback #2"
  depth: string;                  // "Depth: 7.43%"
  duration: string;               // "Duration: 25 days"
  avgVolume: string;              // "Avg Volume: 12.5M"
  dateRange: string;              // "2024-01-15 → 2024-02-10"
  priceRange: string;             // "¥45.20 → ¥41.85"
  additionalInfo?: string[];      // Pullback specific information
}

/**
 * VCP Tooltip data
 */
export interface VcpTooltipData {
  /** Associated line ID */
  lineId: string;
  
  /** Line type */
  lineType: 'contraction' | 'pullback';
  
  /** Display content */
  content: VcpTooltipContent;
  
  /** Tooltip position */
  position: { x: number; y: number };
  
  /** Is visible */
  visible: boolean;
}
