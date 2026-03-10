/**
 * StockService 测试
 * 
 * 测试股票搜索和详情获取功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stockService } from '../../src/services/stock.service';
import * as api from '../../src/services/api';

// Mock axios
vi.mock('../../src/services/api');

describe('StockService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchStocks', () => {
    it('应该根据关键词搜索股票并返回结果', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              stock_code: '600519',
              stock_name: '贵州茅台',
              market: 'SH',
              industry: '白酒',
              market_cap: 25000.5,
              status: 'active'
            }
          ],
          total: 1
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await stockService.searchStocks('茅台');

      expect(api.default.get).toHaveBeenCalledWith('/stocks/search', {
        params: { q: '茅台', limit: 20 }
      });
      expect(result.results).toHaveLength(1);
      expect(result.results[0].stock_code).toBe('600519');
      expect(result.total).toBe(1);
    });

    it('应该使用自定义 limit 参数', async () => {
      const mockResponse = {
        data: { results: [], total: 0 }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      await stockService.searchStocks('test', 10);

      expect(api.default.get).toHaveBeenCalledWith('/stocks/search', {
        params: { q: 'test', limit: 10 }
      });
    });

    it('应该在搜索失败时抛出错误', async () => {
      vi.spyOn(api.default, 'get').mockRejectedValue(new Error('Network error'));

      await expect(stockService.searchStocks('茅台')).rejects.toThrow('Network error');
    });
  });

  describe('getStockDetail', () => {
    it('应该根据股票代码获取详细信息', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          stock_name: '贵州茅台',
          market: 'SH',
          industry: '白酒',
          list_date: '2001-08-27',
          market_cap: 25000.5,
          avg_turnover: 50000.0,
          status: 'active',
          latest_price: 1870.30,
          price_change: 2.5,
          price_change_percent: 0.13
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await stockService.getStockDetail('600519');

      expect(api.default.get).toHaveBeenCalledWith('/stocks/600519');
      expect(result.stock_code).toBe('600519');
      expect(result.stock_name).toBe('贵州茅台');
      expect(result.latest_price).toBe(1870.30);
    });

    it('应该在股票不存在时抛出错误', async () => {
      vi.spyOn(api.default, 'get').mockRejectedValue({
        response: { status: 404, data: { detail: '未找到该股票' } }
      });

      await expect(stockService.getStockDetail('999999')).rejects.toThrow();
    });
  });

  describe('getStockList', () => {
    it('应该获取股票列表并支持分页', async () => {
      const mockResponse = {
        data: {
          stocks: [
            { stock_code: '600519', stock_name: '贵州茅台', market: 'SH', industry: '白酒', market_cap: 25000.5, status: 'active' }
          ],
          total: 1000,
          page: 1,
          page_size: 50,
          total_pages: 20
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await stockService.getStockList(1, 50);

      expect(api.default.get).toHaveBeenCalledWith('/stocks', {
        params: { page: 1, page_size: 50, status: 'active' }
      });
      expect(result.stocks).toHaveLength(1);
      expect(result.total).toBe(1000);
    });
  });
});
