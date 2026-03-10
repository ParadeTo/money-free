/**
 * 选股筛选服务
 */

import { api } from './api';

export interface FilterCondition {
  conditionType: string;
  indicatorName?: string;
  operator?: string;
  targetValue?: number;
  pattern?: string;
  ma1Period?: string;
  ma2Period?: string;
}

export interface StockResult {
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
  stocks: StockResult[];
  isTruncated: boolean;
  totalCount: number;
}

export const screenerService = {
  /**
   * 执行选股筛选
   */
  async executeFilter(
    conditions: FilterCondition[],
    sortBy: string = 'stockCode',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<FilterResult> {
    return api.post<FilterResult>('/screener/execute', {
      conditions,
      sortBy,
      sortOrder,
    });
  },
};
