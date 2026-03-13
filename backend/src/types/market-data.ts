/**
 * 市场数据类型定义
 * 用于港股和美股数据导入和处理
 */

export enum MarketType {
  SH = 'SH',
  SZ = 'SZ',
  HK = 'HK',
  US = 'US',
}

export enum CurrencyType {
  CNY = 'CNY',
  HKD = 'HKD',
  USD = 'USD',
}

export enum IndexCode {
  HS300 = 'HS300',
  ZZ500 = 'ZZ500',
  HSI = 'HSI',
  HSTECH = 'HSTECH',
  SP500 = 'SP500',
  NDX100 = 'NDX100',
}

export interface StockBasicInfo {
  code: string;
  name: string;
  market: MarketType;
  currency: CurrencyType;
  industry?: string;
  listDate: Date;
  marketCap?: number;
  indexCode?: string;
  searchKeywords?: {
    zh: string[];
    en: string[];
  };
}

export interface KLineRecord {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  duration: number;
}

export interface ImportError {
  stockCode: string;
  attemptedSources: Array<{
    source: 'akshare' | 'yahoo_finance';
    errorType: string;
    errorMessage: string;
  }>;
}

export interface IndexConstituent {
  code: string;
  name: string;
  weight?: number;
}

export interface DataSourceConfig {
  market: MarketType;
  primarySource: 'akshare' | 'yahoo_finance';
  backupSource: 'akshare' | 'yahoo_finance';
  retryAttempts: number;
  rateLimitPerSecond: number;
}

export const MARKET_CURRENCY_MAP: Record<MarketType, CurrencyType> = {
  [MarketType.SH]: CurrencyType.CNY,
  [MarketType.SZ]: CurrencyType.CNY,
  [MarketType.HK]: CurrencyType.HKD,
  [MarketType.US]: CurrencyType.USD,
};

export const STOCK_CODE_REGEX: Record<MarketType, RegExp> = {
  [MarketType.SH]: /^(600|601|603|605|688)\d{3}$/,
  [MarketType.SZ]: /^(000|001|002|003|300)\d{3}$/,
  [MarketType.HK]: /^\d{4,5}\.HK$/,
  [MarketType.US]: /^[A-Z]{1,5}(\.US)?$/,
};
