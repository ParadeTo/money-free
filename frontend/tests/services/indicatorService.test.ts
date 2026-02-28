/**
 * IndicatorService 测试
 * 
 * 测试技术指标数据获取功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { indicatorService } from '../../src/services/indicator.service';
import * as api from '../../src/services/api';

// Mock axios
vi.mock('../../src/services/api');

describe('IndicatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIndicators', () => {
    it('应该获取指定股票的所有技术指标数据', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'daily',
          indicators: {
            MA50: [
              { date: '2026-02-28', value: 1820.55 },
              { date: '2026-02-27', value: 1818.30 }
            ],
            RSI: [
              { date: '2026-02-28', value: 65.5 },
              { date: '2026-02-27', value: 63.2 }
            ]
          },
          count: 2
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await indicatorService.getIndicators('600519', 'daily');

      expect(api.default.get).toHaveBeenCalledWith('/indicators/600519', {
        params: { period: 'daily' }
      });
      expect(result.indicators.MA50).toHaveLength(2);
      expect(result.indicators.RSI).toHaveLength(2);
    });

    it('应该支持指定特定指标类型', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'daily',
          indicators: {
            MA50: [{ date: '2026-02-28', value: 1820.55 }]
          },
          count: 1
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      await indicatorService.getIndicators('600519', 'daily', ['MA50', 'RSI']);

      expect(api.default.get).toHaveBeenCalledWith('/indicators/600519', {
        params: { 
          period: 'daily',
          indicator_types: 'MA50,RSI'
        }
      });
    });

    it('应该支持自定义日期范围', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'daily',
          indicators: {},
          count: 0
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      await indicatorService.getIndicators('600519', 'daily', undefined, '2024-01-01', '2026-02-28');

      expect(api.default.get).toHaveBeenCalledWith('/indicators/600519', {
        params: { 
          period: 'daily',
          start_date: '2024-01-01',
          end_date: '2026-02-28'
        }
      });
    });

    it('应该在数据不足时返回空指标', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'daily',
          indicators: {
            MA200: [{ date: '2026-02-28', value: null }]
          },
          count: 1
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await indicatorService.getIndicators('600519', 'daily');

      expect(result.indicators.MA200[0].value).toBeNull();
    });
  });

  describe('get52WeekMarkers', () => {
    it('应该获取52周高低点标记数据', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          high_52w: {
            date: '2026-01-15',
            value: 1950.00,
            label: '52周最高'
          },
          low_52w: {
            date: '2025-08-20',
            value: 1650.00,
            label: '52周最低'
          },
          current_price: 1870.30,
          current_date: '2026-02-28'
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await indicatorService.get52WeekMarkers('600519');

      expect(api.default.get).toHaveBeenCalledWith('/indicators/600519/week52-markers');
      expect(result.high_52w.value).toBe(1950.00);
      expect(result.low_52w.value).toBe(1650.00);
    });

    it('应该在上市时间不足1年时返回错误', async () => {
      vi.spyOn(api.default, 'get').mockRejectedValue({
        response: { 
          status: 400, 
          data: { detail: '上市时间不足1年，暂无52周高低点' } 
        }
      });

      await expect(indicatorService.get52WeekMarkers('688001')).rejects.toThrow();
    });
  });
});
