// frontend/src/types/filter.ts
// T155 [P] [US2] FilterCondition and FilterResult interfaces

export interface FilterCondition {
  conditionType:
    | 'indicator_value'
    | 'pattern'
    | 'price_change'
    | 'volume_change'
    | 'week_52_high'
    | 'week_52_low'
    | 'near_52_high'
    | 'near_52_low';

  // For indicator_value type
  indicatorName?:
    | 'ma50'
    | 'ma150'
    | 'ma200'
    | 'kdj_k'
    | 'kdj_d'
    | 'kdj_j'
    | 'rsi'
    | 'volume'
    | 'amount';
  operator?: '>' | '<' | '>=' | '<=' | '=';
  targetValue?: number;

  // For pattern type
  pattern?:
    | 'kdj_golden_cross'
    | 'kdj_death_cross'
    | 'price_above_ma'
    | 'price_below_ma';
}

export interface FilterStock {
  stockCode: string;
  stockName: string;
  market: string;
  latestPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  volume?: number;
  amount?: number;
  marketCap?: number;
}

export interface FilterResult {
  stocks: FilterStock[];
  isTruncated: boolean;
  totalCount: number;
}

export interface ExecuteFilterRequest {
  conditions: FilterCondition[];
  sortBy?: 'stockCode' | 'priceChangePercent' | 'amount' | 'marketCap';
  sortOrder?: 'asc' | 'desc';
}
