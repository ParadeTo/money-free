/**
 * 数据源适配器统一接口
 * 所有数据源（AkShare、Yahoo Finance）必须实现此接口
 */

import { MarketType, CurrencyType } from '../../../types/market-data';

export interface IndexConstituent {
  code: string;
  name: string;
  weight?: number;
}

export interface StockInfo {
  code: string;
  name: string;
  market: MarketType;
  currency: CurrencyType;
  industry?: string;
  listDate: string;
  marketCap?: number;
}

export interface KlineRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface IDataSourceAdapter {
  readonly name: 'akshare' | 'yahoo_finance';

  fetchIndexConstituents(indexCode: string): Promise<IndexConstituent[]>;

  fetchStockInfo(symbol: string, market: MarketType): Promise<StockInfo>;

  fetchKlineData(
    symbol: string,
    market: MarketType,
    startDate: string,
    endDate: string,
  ): Promise<KlineRecord[]>;

  checkAvailability(): Promise<boolean>;
}
