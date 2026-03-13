/**
 * 前端股票数据类型定义
 * 支持A股、港股、美股
 */

export type MarketType = 'SH' | 'SZ' | 'HK' | 'US';
export type CurrencyType = 'CNY' | 'HKD' | 'USD';
export type IndexCode = 'HS300' | 'ZZ500' | 'HSI' | 'HSTECH' | 'SP500' | 'NDX100';

export interface Stock {
  stockCode: string;
  stockName: string;
  market: MarketType;
  currency: CurrencyType;
  industry?: string;
  listDate: string;
  marketCap?: number;
  avgTurnover?: number;
  admissionStatus: 'active' | 'inactive';
  indexCode?: IndexCode | null;
  searchKeywords?: {
    zh: string[];
    en: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  source: 'tushare' | 'akshare' | 'yahoo_finance';
}

export interface VcpScanResult {
  id: number;
  stockCode: string;
  scanDate: string;
  trendTemplatePass: boolean;
  trendTemplateDetails: string;
  contractionCount: number;
  lastContractionPct: number;
  contractions: string;
  volumeDryingUp: boolean;
  rsRating: number;
  latestPrice: number;
  priceChangePct: number;
  distFrom52WeekHigh: number;
  distFrom52WeekLow: number;
  inPullback: boolean;
  pullbackCount: number;
  lastPullbackData?: string;
  createdAt: string;
  stock?: Stock;
}

export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  'CNY': '¥',
  'HKD': 'HK$',
  'USD': '$',
};

export const MARKET_LABELS: Record<MarketType, string> = {
  'SH': 'A股(沪)',
  'SZ': 'A股(深)',
  'HK': '港股',
  'US': '美股',
};

export const INDEX_LABELS: Record<IndexCode, string> = {
  'HS300': '沪深300',
  'ZZ500': '中证500',
  'HSI': '恒生指数',
  'HSTECH': '恒生科技',
  'SP500': '标普500',
  'NDX100': '纳斯达克100',
};
