/**
 * useKLineData Hook 测试
 *
 * 测试K线数据管理Hook的状态和行为
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKLineData } from '../../src/hooks/useKLineData';
import { klineService } from '../../src/services/kline.service';

vi.mock('../../src/services/kline.service');

vi.mock('../../src/utils/dateRange', () => ({
  getDateRangeFromTimeRange: vi.fn(() => ({
    startDate: '2025-04-01',
    endDate: undefined,
  })),
}));

describe('useKLineData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该初始化为空状态', async () => {
    vi.mocked(klineService.getKLineData).mockResolvedValue({
      stockCode: '600519',
      period: 'daily',
      data: [],
      count: 0,
    });

    const { result } = renderHook(() => useKLineData('600519', 'daily'));

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该在挂载时自动加载K线数据', async () => {
    const mockData = {
      stockCode: '600519',
      period: 'daily' as const,
      data: [
        {
          date: '2026-02-28',
          open: 1850.0,
          high: 1880.5,
          low: 1845.0,
          close: 1870.3,
          volume: 123456,
          amount: 230000000.0,
        },
      ],
      count: 1,
    };

    vi.mocked(klineService.getKLineData).mockResolvedValue(mockData);

    const { result } = renderHook(() => useKLineData('600519', 'daily'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].close).toBe(1870.3);
    expect(klineService.getKLineData).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({
        period: 'daily',
        startDate: expect.any(String),
        limit: 2000,
      })
    );
  });

  it('应该在股票代码或周期变化时重新加载数据', async () => {
    vi.mocked(klineService.getKLineData)
      .mockResolvedValueOnce({
        stockCode: '600519',
        period: 'daily',
        data: [],
        count: 0,
      })
      .mockResolvedValueOnce({
        stockCode: '600519',
        period: 'weekly',
        data: [],
        count: 0,
      });

    const { result, rerender } = renderHook(
      ({ stockCode, period }) => useKLineData(stockCode, period),
      { initialProps: { stockCode: '600519', period: 'daily' as const } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ stockCode: '600519', period: 'weekly' as const });

    await waitFor(() => {
      expect(klineService.getKLineData).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该处理加载错误', async () => {
    const mockError = new Error('Network error');
    vi.mocked(klineService.getKLineData).mockRejectedValue(mockError);

    const { result } = renderHook(() => useKLineData('600519', 'daily'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toEqual([]);
  });

  it('应该支持手动刷新数据', async () => {
    vi.mocked(klineService.getKLineData).mockResolvedValue({
      stockCode: '600519',
      period: 'daily',
      data: [],
      count: 0,
    });

    const { result } = renderHook(() => useKLineData('600519', 'daily'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(klineService.getKLineData).toHaveBeenCalledTimes(1);

    result.current.refresh();

    await waitFor(() => {
      expect(klineService.getKLineData).toHaveBeenCalledTimes(2);
    });

    expect(result.current.loading).toBe(false);
  });

  it('应该支持不同时间范围', async () => {
    vi.mocked(klineService.getKLineData).mockResolvedValue({
      stockCode: '600519',
      period: 'daily',
      data: [],
      count: 0,
    });

    const { result } = renderHook(() => useKLineData('600519', 'daily', '3M'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(klineService.getKLineData).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({
        period: 'daily',
        limit: 2000,
      })
    );
  });
});
