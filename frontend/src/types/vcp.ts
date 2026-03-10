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
