/**
 * KLineService 测试
 * 
 * 测试K线数据获取功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { klineService } from '../../src/services/kline.service';
import * as api from '../../src/services/api';

// Mock axios
vi.mock('../../src/services/api');

describe('KLineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKLineData', () => {
    it('应该获取指定股票的日K线数据', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'daily',
          data: [
            {
              date: '2026-02-28',
              open: 1850.00,
              high: 1880.50,
              low: 1845.00,
              close: 1870.30,
              volume: 123456,
              turnover: 230000000.0
            },
            {
              date: '2026-02-27',
              open: 1840.00,
              high: 1855.00,
              low: 1835.00,
              close: 1850.00,
              volume: 110000,
              turnover: 203500000.0
            }
          ],
          count: 2
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await klineService.getKLineData('600519', 'daily');

      expect(api.default.get).toHaveBeenCalledWith('/klines/600519', {
        params: { period: 'daily' }
      });
      expect(result.data).toHaveLength(2);
      expect(result.period).toBe('daily');
    });

    it('应该获取指定股票的周K线数据', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'weekly',
          data: [],
          count: 0
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      const result = await klineService.getKLineData('600519', 'weekly');

      expect(api.default.get).toHaveBeenCalledWith('/klines/600519', {
        params: { period: 'weekly' }
      });
      expect(result.period).toBe('weekly');
    });

    it('应该支持自定义日期范围', async () => {
      const mockResponse = {
        data: {
          stock_code: '600519',
          period: 'daily',
          data: [],
          count: 0
        }
      };

      vi.spyOn(api.default, 'get').mockResolvedValue(mockResponse);

      await klineService.getKLineData('600519', 'daily', '2024-01-01', '2026-02-28');

      expect(api.default.get).toHaveBeenCalledWith('/klines/600519', {
        params: { 
          period: 'daily',
          start_date: '2024-01-01',
          end_date: '2026-02-28'
        }
      });
    });

    it('应该在数据加载失败时抛出错误', async () => {
      vi.spyOn(api.default, 'get').mockRejectedValue({
        response: { status: 503, data: { detail: '数据加载失败，请稍后重试' } }
      });

      await expect(klineService.getKLineData('600519', 'daily')).rejects.toThrow();
    });
  });

  describe('refreshKLineData', () => {
    it('应该触发指定股票的数据更新', async () => {
      const mockResponse = {
        data: {
          message: '数据更新成功',
          stock_code: '600519',
          updated_records: {
            kline_data: 1,
            indicators: 14
          }
        }
      };

      vi.spyOn(api.default, 'post').mockResolvedValue(mockResponse);

      const result = await klineService.refreshKLineData('600519');

      expect(api.default.post).toHaveBeenCalledWith('/klines/600519/refresh');
      expect(result.message).toBe('数据更新成功');
      expect(result.updated_records.kline_data).toBe(1);
    });
  });
});
