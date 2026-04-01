/**
 * KLineService 测试
 *
 * 测试K线数据获取功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { klineService } from '../../src/services/kline.service';
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

describe('KLineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKLineData', () => {
    it('应该获取指定股票的日K线数据', async () => {
      const mockData = {
        stockCode: '600519',
        period: 'daily',
        data: [
          { date: '2026-02-28', open: 1850.0, high: 1880.5, low: 1845.0, close: 1870.3, volume: 123456, amount: 230000000.0 },
          { date: '2026-02-27', open: 1840.0, high: 1855.0, low: 1835.0, close: 1850.0, volume: 110000, amount: 203500000.0 },
        ],
        count: 2,
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await klineService.getKLineData('600519', { period: 'daily' });

      expect(api.get).toHaveBeenCalledWith('/klines/600519', {
        params: { period: 'daily' },
      });
      expect(result.data).toHaveLength(2);
      expect(result.period).toBe('daily');
    });

    it('应该获取指定股票的周K线数据', async () => {
      const mockData = { stockCode: '600519', period: 'weekly', data: [], count: 0 };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await klineService.getKLineData('600519', { period: 'weekly' });

      expect(api.get).toHaveBeenCalledWith('/klines/600519', {
        params: { period: 'weekly' },
      });
      expect(result.period).toBe('weekly');
    });

    it('应该支持自定义日期范围', async () => {
      vi.mocked(api.get).mockResolvedValue({ stockCode: '600519', period: 'daily', data: [], count: 0 });

      await klineService.getKLineData('600519', {
        period: 'daily',
        startDate: '2024-01-01',
        endDate: '2026-02-28',
      });

      expect(api.get).toHaveBeenCalledWith('/klines/600519', {
        params: { period: 'daily', startDate: '2024-01-01', endDate: '2026-02-28' },
      });
    });

    it('应该在数据加载失败时抛出错误', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('数据加载失败'));

      await expect(klineService.getKLineData('600519')).rejects.toThrow();
    });
  });
});
