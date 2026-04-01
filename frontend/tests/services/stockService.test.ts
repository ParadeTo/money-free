/**
 * StockService 测试
 *
 * 测试股票搜索和详情获取功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stockService } from '../../src/services/stock.service';
import api from '../../src/services/api';

vi.mock('../../src/services/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    getAxiosInstance: vi.fn(),
  };
  return { default: mockApi, api: mockApi };
});

describe('StockService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchStocks', () => {
    it('应该根据关键词搜索股票并返回结果', async () => {
      const mockData = {
        data: [
          {
            stockCode: '600519',
            stockName: '贵州茅台',
            market: 'SH',
            industry: '白酒',
          },
        ],
        meta: { total: 1, page: 1, limit: 10 },
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await stockService.searchStocks({ search: '茅台' });

      expect(api.get).toHaveBeenCalledWith('/stocks/search', {
        params: { search: '茅台' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].stockCode).toBe('600519');
    });

    it('应该使用自定义 limit 参数', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10 } });

      await stockService.searchStocks({ search: 'test', limit: 10 });

      expect(api.get).toHaveBeenCalledWith('/stocks/search', {
        params: { search: 'test', limit: 10 },
      });
    });

    it('应该在搜索失败时抛出错误', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await expect(stockService.searchStocks({ search: '茅台' })).rejects.toThrow('Network error');
    });
  });

  describe('getStockDetail', () => {
    it('应该根据股票代码获取详细信息', async () => {
      const mockData = {
        stockCode: '600519',
        stockName: '贵州茅台',
        market: 'SH',
        industry: '白酒',
        listDate: '2001-08-27',
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await stockService.getStockDetail('600519');

      expect(api.get).toHaveBeenCalledWith('/stocks/600519');
      expect(result.stockCode).toBe('600519');
      expect(result.stockName).toBe('贵州茅台');
    });

    it('应该在股票不存在时抛出错误', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Not found'));

      await expect(stockService.getStockDetail('999999')).rejects.toThrow();
    });
  });
});
