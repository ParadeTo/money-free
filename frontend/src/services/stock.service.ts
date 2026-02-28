import api from './api';
import type { Stock, PaginatedResponse } from '../types';

export interface SearchStocksParams {
  search?: string;
  market?: 'SSE' | 'SZSE' | 'all';
  admissionStatus?: 'admitted' | 'candidate' | 'all';
  page?: number;
  limit?: number;
}

class StockService {
  /**
   * 搜索股票
   */
  async searchStocks(params: SearchStocksParams = {}): Promise<PaginatedResponse<Stock>> {
    return await api.get('/stocks/search', {
      params,
    });
  }

  /**
   * 获取股票详情
   */
  async getStockDetail(stockCode: string): Promise<Stock> {
    return await api.get(`/stocks/${stockCode}`);
  }
}

export const stockService = new StockService();
export default stockService;
