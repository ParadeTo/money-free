/**
 * useIndicators Hook 测试
 * 
 * 测试技术指标数据管理Hook的状态和行为
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIndicators } from '../../src/hooks/useIndicators';
import { indicatorService } from '../../src/services/indicator.service';

// Mock indicatorService
vi.mock('../../src/services/indicator.service');

describe('useIndicators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该初始化为空状态', async () => {
    vi.spyOn(indicatorService, 'getIndicators').mockResolvedValue({
      stock_code: '600519',
      period: 'daily' as const,
      indicators: {},
      count: 0
    });

    const { result } = renderHook(() => useIndicators('600519', 'daily'));
    
    // 注意：由于 useEffect 会立即触发加载，初始状态是 loading: true
    expect(result.current.indicators).toEqual({});
    expect(result.current.error).toBeNull();
    
    // 等待加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该在挂载时自动加载指标数据', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
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
    };

    vi.spyOn(indicatorService, 'getIndicators').mockResolvedValue(mockData);

    const { result } = renderHook(() => useIndicators('600519', 'daily'));
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.indicators.MA50).toHaveLength(2);
    expect(result.current.indicators.RSI).toHaveLength(2);
    expect(indicatorService.getIndicators).toHaveBeenCalledWith('600519', 'daily', undefined, undefined, undefined);
  });

  it('应该支持指定特定指标类型', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
      indicators: {
        MA50: [{ date: '2026-02-28', value: 1820.55 }]
      },
      count: 1
    };

    vi.spyOn(indicatorService, 'getIndicators').mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useIndicators('600519', 'daily', ['MA50', 'RSI'])
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(indicatorService.getIndicators).toHaveBeenCalledWith('600519', 'daily', ['MA50', 'RSI'], undefined, undefined);
  });

  it('应该在参数变化时重新加载数据', async () => {
    const mockData1 = {
      stock_code: '600519',
      period: 'daily' as const,
      indicators: {},
      count: 0
    };
    
    const mockData2 = {
      stock_code: '600519',
      period: 'weekly' as const,
      indicators: {},
      count: 0
    };

    vi.spyOn(indicatorService, 'getIndicators')
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ stockCode, period }) => useIndicators(stockCode, period),
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
    
    expect(indicatorService.getIndicators).toHaveBeenCalledTimes(2);
  });

  it('应该处理加载错误', async () => {
    const mockError = new Error('Failed to load indicators');
    vi.spyOn(indicatorService, 'getIndicators').mockRejectedValue(mockError);

    const { result } = renderHook(() => useIndicators('600519', 'daily'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBe(mockError);
    expect(result.current.indicators).toEqual({});
  });

  it('应该支持手动刷新数据', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
      indicators: {},
      count: 0
    };

    vi.spyOn(indicatorService, 'getIndicators').mockResolvedValue(mockData);

    const { result } = renderHook(() => useIndicators('600519', 'daily'));
    
    // 等待初始加载完成
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(indicatorService.getIndicators).toHaveBeenCalledTimes(1);
    
    // 手动刷新
    result.current.refresh();
    
    // 等待刷新完成，验证服务被调用了第二次
    await waitFor(() => {
      expect(indicatorService.getIndicators).toHaveBeenCalledTimes(2);
    });
    
    // 最终状态应该是 loading: false
    expect(result.current.loading).toBe(false);
  });

  it('应该支持自定义日期范围', async () => {
    const mockData = {
      stock_code: '600519',
      period: 'daily' as const,
      indicators: {},
      count: 0
    };

    vi.spyOn(indicatorService, 'getIndicators').mockResolvedValue(mockData);

    const { result } = renderHook(() => 
      useIndicators('600519', 'daily', undefined, '2024-01-01', '2026-02-28')
    );
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(indicatorService.getIndicators).toHaveBeenCalledWith('600519', 'daily', undefined, '2024-01-01', '2026-02-28');
  });
});
