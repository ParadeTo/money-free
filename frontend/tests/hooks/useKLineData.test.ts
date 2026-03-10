/**
 * useKLineData Hook 测试
 * 
 * 测试K线数据管理Hook的状态和行为
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKLineData } from '../../src/hooks/useKLineData';
import { klineService } from '../../src/services/kline.service';

// Mock klineService
vi.mock('../../src/services/kline.service');

describe('useKLineData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该初始化为空状态', async () => {
    vi.spyOn(klineService, 'getKLineData').mockResolvedValue({
      stock_code: '600519',
      period: 'daily' as const,
      data: [],
      count: 0
    });

    const { result } = renderHook(() => useKLineData('600519', 'daily'));
    
    // 注意：由于 useEffect 会立即触发加载，初始状态是 loading: true
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    
    // 等待加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该在挂载时自动加载K线数据', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
      data: [
        {
          date: '2026-02-28',
          open: 1850.00,
          high: 1880.50,
          low: 1845.00,
          close: 1870.30,
          volume: 123456,
          turnover: 230000000.0
        }
      ],
      count: 1
    };

    vi.spyOn(klineService, 'getKLineData').mockResolvedValue(mockData);

    const { result } = renderHook(() => useKLineData('600519', 'daily'));
    
    // 初始状态应该是加载中
    expect(result.current.loading).toBe(true);
    
    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].close).toBe(1870.30);
    expect(klineService.getKLineData).toHaveBeenCalledWith('600519', 'daily', undefined, undefined);
  });

  it('应该在股票代码或周期变化时重新加载数据', async () => {
    const mockData1 = {
      stock_code: '600519',
      period: 'daily' as const,
      data: [],
      count: 0
    };
    
    const mockData2 = {
      stock_code: '600519',
      period: 'weekly' as const,
      data: [],
      count: 0
    };

    vi.spyOn(klineService, 'getKLineData')
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ stockCode, period }) => useKLineData(stockCode, period),
      { initialProps: { stockCode: '600519', period: 'daily' as const } }
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // 改变周期
    rerender({ stockCode: '600519', period: 'weekly' as const });
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(klineService.getKLineData).toHaveBeenCalledTimes(2);
    expect(klineService.getKLineData).toHaveBeenNthCalledWith(2, '600519', 'weekly', undefined, undefined);
  });

  it('应该处理加载错误', async () => {
    const mockError = new Error('Network error');
    vi.spyOn(klineService, 'getKLineData').mockRejectedValue(mockError);

    const { result } = renderHook(() => useKLineData('600519', 'daily'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toEqual([]);
  });

  it('应该支持手动刷新数据', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
      data: [],
      count: 0
    };

    vi.spyOn(klineService, 'getKLineData').mockResolvedValue(mockData);

    const { result } = renderHook(() => useKLineData('600519', 'daily'));
    
    // 等待初始加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(klineService.getKLineData).toHaveBeenCalledTimes(1);
    
    // 手动刷新
    result.current.refresh();
    
    // 等待刷新完成，验证服务被调用了第二次
    await waitFor(() => {
      expect(klineService.getKLineData).toHaveBeenCalledTimes(2);
    });
    
    // 最终状态应该是 loading: false
    expect(result.current.loading).toBe(false);
  });

  it('应该支持自定义日期范围', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
      data: [],
      count: 0
    };

    vi.spyOn(klineService, 'getKLineData').mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useKLineData('600519', 'daily', '2024-01-01', '2026-02-28')
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(klineService.getKLineData).toHaveBeenCalledWith('600519', 'daily', '2024-01-01', '2026-02-28');
  });
});
