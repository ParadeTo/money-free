/**
 * useIndicators Hook 测试
 *
 * 测试技术指标数据管理Hook的状态和行为
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIndicators } from '../../src/hooks/useIndicators';
import { indicatorService } from '../../src/services/indicator.service';

vi.mock('../../src/services/indicator.service');

vi.mock('../../src/utils/dateRange', () => ({
  getDateRangeFromTimeRange: vi.fn(() => ({
    startDate: '2025-04-01',
    endDate: undefined,
  })),
}));

describe('useIndicators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(indicatorService.get52WeekMarkers).mockResolvedValue(null);
  });

  it('应该初始化为空状态', async () => {
    const { result } = renderHook(() => useIndicators('600519', 'daily'));

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该在挂载时自动加载指标数据（需要请求指标时）', async () => {
    const mockResponse = {
      stockCode: '600519',
      period: 'daily' as const,
      data: [
        { id: 1, stockCode: '600519', date: '2026-02-28', period: 'daily', indicatorType: 'ma', values: '{"ma50":1820.55}', calculatedAt: '' },
        { id: 2, stockCode: '600519', date: '2026-02-27', period: 'daily', indicatorType: 'ma', values: '{"ma50":1818.30}', calculatedAt: '' },
      ],
      count: 2,
    };

    vi.mocked(indicatorService.getIndicators).mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useIndicators('600519', 'daily', 'none', 'none', true, '1Y')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(indicatorService.getIndicators).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({
        period: 'daily',
        indicators: ['ma'],
      })
    );
  });

  it('不请求指标时不应调用 getIndicators', async () => {
    const { result } = renderHook(() =>
      useIndicators('600519', 'daily', 'none', 'none', false, '1Y')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(indicatorService.getIndicators).not.toHaveBeenCalled();
    expect(indicatorService.get52WeekMarkers).toHaveBeenCalledWith('600519', 'daily');
  });

  it('应该在参数变化时重新加载数据', async () => {
    vi.mocked(indicatorService.getIndicators).mockResolvedValue({
      stockCode: '600519',
      period: 'daily',
      data: [],
      count: 0,
    });

    const { result, rerender } = renderHook(
      ({ stockCode, period, showMA }) => useIndicators(stockCode, period, 'none', 'none', showMA, '1Y'),
      { initialProps: { stockCode: '600519', period: 'daily' as const, showMA: true } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.mocked(indicatorService.getIndicators).mockResolvedValue({
      stockCode: '600519',
      period: 'weekly',
      data: [],
      count: 0,
    });

    rerender({ stockCode: '600519', period: 'weekly' as const, showMA: true });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(indicatorService.getIndicators).toHaveBeenCalledTimes(2);
  });

  it('应该处理加载错误', async () => {
    const mockError = new Error('Failed to load indicators');
    vi.mocked(indicatorService.getIndicators).mockRejectedValue(mockError);
    vi.mocked(indicatorService.get52WeekMarkers).mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useIndicators('600519', 'daily', 'none', 'none', true, '1Y')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toEqual([]);
  });

  it('应该支持手动刷新数据', async () => {
    vi.mocked(indicatorService.getIndicators).mockResolvedValue({
      stockCode: '600519',
      period: 'daily',
      data: [],
      count: 0,
    });

    const { result } = renderHook(() =>
      useIndicators('600519', 'daily', 'none', 'none', true, '1Y')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(indicatorService.getIndicators).toHaveBeenCalledTimes(1);

    result.current.refresh();

    await waitFor(() => {
      expect(indicatorService.getIndicators).toHaveBeenCalledTimes(2);
    });

    expect(result.current.loading).toBe(false);
  });

  it('应该支持指定副图指标', async () => {
    vi.mocked(indicatorService.getIndicators).mockResolvedValue({
      stockCode: '600519',
      period: 'daily',
      data: [],
      count: 0,
    });

    const { result } = renderHook(() =>
      useIndicators('600519', 'daily', 'kdj', 'volume', true, '1Y')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(indicatorService.getIndicators).toHaveBeenCalledWith(
      '600519',
      expect.objectContaining({
        indicators: expect.arrayContaining(['ma', 'kdj', 'volume']),
      })
    );
  });
});
