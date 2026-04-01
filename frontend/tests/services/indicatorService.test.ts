/**
 * IndicatorService 测试
 *
 * 测试技术指标数据获取功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { indicatorService } from '../../src/services/indicator.service';
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

describe('IndicatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIndicators', () => {
    it('应该获取指定股票的所有技术指标数据', async () => {
      const mockData = {
        stockCode: '600519',
        period: 'daily',
        data: [
          { id: 1, stockCode: '600519', date: '2026-02-28', period: 'daily', indicatorType: 'ma', values: '{}', calculatedAt: '' },
          { id: 2, stockCode: '600519', date: '2026-02-27', period: 'daily', indicatorType: 'ma', values: '{}', calculatedAt: '' },
        ],
        count: 2,
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await indicatorService.getIndicators('600519', { period: 'daily' });

      expect(api.get).toHaveBeenCalledWith('/indicators/600519', {
        params: { period: 'daily' },
      });
      expect(result.data).toHaveLength(2);
    });

    it('应该支持指定特定指标类型', async () => {
      vi.mocked(api.get).mockResolvedValue({ stockCode: '600519', period: 'daily', data: [], count: 0 });

      await indicatorService.getIndicators('600519', {
        period: 'daily',
        indicators: ['MA50', 'RSI'],
      });

      expect(api.get).toHaveBeenCalledWith('/indicators/600519', {
        params: { period: 'daily', indicators: ['MA50', 'RSI'] },
      });
    });

    it('应该支持自定义日期范围', async () => {
      vi.mocked(api.get).mockResolvedValue({ stockCode: '600519', period: 'daily', data: [], count: 0 });

      await indicatorService.getIndicators('600519', {
        period: 'daily',
        startDate: '2024-01-01',
        endDate: '2026-02-28',
      });

      expect(api.get).toHaveBeenCalledWith('/indicators/600519', {
        params: { period: 'daily', startDate: '2024-01-01', endDate: '2026-02-28' },
      });
    });

    it('应该在数据不足时返回空指标', async () => {
      vi.mocked(api.get).mockResolvedValue({ stockCode: '600519', period: 'daily', data: [], count: 0 });

      const result = await indicatorService.getIndicators('600519');

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('get52WeekMarkers', () => {
    it('应该获取52周高低点标记数据', async () => {
      const mockData = {
        stockCode: '600519',
        period: 'daily',
        high52Week: 1950.0,
        low52Week: 1650.0,
        high52WeekDate: '2026-01-15',
        low52WeekDate: '2025-08-20',
        date: '2026-02-28',
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await indicatorService.get52WeekMarkers('600519');

      expect(api.get).toHaveBeenCalledWith('/indicators/600519/week52-markers', {
        params: { period: 'daily' },
      });
      expect(result!.high52Week).toBe(1950.0);
      expect(result!.low52Week).toBe(1650.0);
    });

    it('应该在请求失败时返回 null', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Insufficient data'));

      const result = await indicatorService.get52WeekMarkers('688001');

      expect(result).toBeNull();
    });
  });
});
