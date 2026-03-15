/**
 * useVcpOverlay Hook Tests
 * T013: Hook logic tests (data conversion, visibility filtering, coordinate mapping)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVcpOverlay } from '../../src/hooks/useVcpOverlay';
import type { VcpAnalysis } from '../../src/types/vcp';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

describe('useVcpOverlay', () => {
  let mockChart: Partial<IChartApi>;
  let mockSeries: Partial<ISeriesApi<'Candlestick'>>;

  beforeEach(() => {
    mockChart = {
      timeScale: vi.fn(() => ({
        timeToCoordinate: vi.fn((time) => 100),
        getVisibleLogicalRange: vi.fn(() => ({ from: 0, to: 100 })),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        unsubscribeVisibleLogicalRangeChange: vi.fn(),
      })),
    } as any;

    mockSeries = {
      priceToCoordinate: vi.fn((price) => 200),
    } as any;
  });

  it('should return empty arrays when vcpData is null', () => {
    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: null,
        chart: mockChart as IChartApi,
        series: mockSeries as ISeriesApi<'Candlestick'>,
        visible: true,
      })
    );

    expect(result.current.visibleLines).toEqual([]);
    expect(result.current.visibleMarkers).toEqual([]);
    expect(result.current.visibleLabels).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return empty arrays when visible is false', () => {
    const mockVcpData: VcpAnalysis = {
      stockCode: '600233',
      stockName: '圆通速递',
      market: 'SH',
      currency: 'CNY',
      scanDate: '2024-03-14',
      cached: false,
      isExpired: false,
      hasVcp: true,
      summary: {
        contractionCount: 1,
        lastContractionPct: 7.43,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 0,
        latestPrice: 15.5,
        priceChangePct: 2.3,
        distFrom52WeekHigh: 8.5,
        distFrom52WeekLow: 45.2,
      },
      contractions: [
        {
          index: 1,
          swingHighDate: '2024-01-15',
          swingHighPrice: 45.2,
          swingLowDate: '2024-02-10',
          swingLowPrice: 41.85,
          depthPct: 7.43,
          durationDays: 25,
          avgVolume: 125000,
        },
      ],
      pullbacks: [],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: mockVcpData,
        chart: mockChart as IChartApi,
        series: mockSeries as ISeriesApi<'Candlestick'>,
        visible: false,
      })
    );

    expect(result.current.visibleLines).toEqual([]);
    expect(result.current.visibleMarkers).toEqual([]);
    expect(result.current.visibleLabels).toEqual([]);
  });

  it('should convert VCP data to line data', () => {
    const mockVcpData: VcpAnalysis = {
      stockCode: '600233',
      stockName: '圆通速递',
      market: 'SH',
      currency: 'CNY',
      scanDate: '2024-03-14',
      cached: false,
      isExpired: false,
      hasVcp: true,
      summary: {
        contractionCount: 2,
        lastContractionPct: 5.5,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 1,
        latestPrice: 15.5,
        priceChangePct: 2.3,
        distFrom52WeekHigh: 8.5,
        distFrom52WeekLow: 45.2,
      },
      contractions: [
        {
          index: 1,
          swingHighDate: '2024-01-15',
          swingHighPrice: 45.2,
          swingLowDate: '2024-02-10',
          swingLowPrice: 41.85,
          depthPct: 7.43,
          durationDays: 25,
          avgVolume: 125000,
        },
        {
          index: 2,
          swingHighDate: '2024-02-20',
          swingHighPrice: 44.0,
          swingLowDate: '2024-03-05',
          swingLowPrice: 41.5,
          depthPct: 5.68,
          durationDays: 14,
          avgVolume: 110000,
        },
      ],
      pullbacks: [
        {
          index: 1,
          highDate: '2024-03-10',
          highPrice: 43.0,
          lowDate: '2024-03-18',
          lowPrice: 41.8,
          pullbackPct: 2.79,
          durationDays: 8,
          avgVolume: 95000,
          isInUptrend: true,
          daysSinceLow: 3,
        },
      ],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: mockVcpData,
        chart: mockChart as IChartApi,
        series: mockSeries as ISeriesApi<'Candlestick'>,
        visible: true,
      })
    );

    expect(result.current.visibleLines).toHaveLength(3); // 2 contractions + 1 pullback
    expect(result.current.visibleLines[0].type).toBe('contraction');
    expect(result.current.visibleLines[0].id).toBe('C-1');
    expect(result.current.visibleLines[2].type).toBe('pullback');
    expect(result.current.visibleLines[2].id).toBe('P-1');
  });

  it('should generate markers for all lines', () => {
    const mockVcpData: VcpAnalysis = {
      stockCode: '600233',
      stockName: '圆通速递',
      market: 'SH',
      currency: 'CNY',
      scanDate: '2024-03-14',
      cached: false,
      isExpired: false,
      hasVcp: true,
      summary: {
        contractionCount: 1,
        lastContractionPct: 7.43,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 0,
        latestPrice: 15.5,
        priceChangePct: 2.3,
        distFrom52WeekHigh: 8.5,
        distFrom52WeekLow: 45.2,
      },
      contractions: [
        {
          index: 1,
          swingHighDate: '2024-01-15',
          swingHighPrice: 45.2,
          swingLowDate: '2024-02-10',
          swingLowPrice: 41.85,
          depthPct: 7.43,
          durationDays: 25,
          avgVolume: 125000,
        },
      ],
      pullbacks: [],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: mockVcpData,
        chart: mockChart as IChartApi,
        series: mockSeries as ISeriesApi<'Candlestick'>,
        visible: true,
      })
    );

    expect(result.current.visibleMarkers).toHaveLength(2); // 2 markers per line (high + low)
    expect(result.current.visibleMarkers[0].type).toBe('swing-high');
    expect(result.current.visibleMarkers[1].type).toBe('swing-low');
  });

  it('should generate labels for all lines', () => {
    const mockVcpData: VcpAnalysis = {
      stockCode: '600233',
      stockName: '圆通速递',
      market: 'SH',
      currency: 'CNY',
      scanDate: '2024-03-14',
      cached: false,
      isExpired: false,
      hasVcp: true,
      summary: {
        contractionCount: 1,
        lastContractionPct: 7.43,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 0,
        latestPrice: 15.5,
        priceChangePct: 2.3,
        distFrom52WeekHigh: 8.5,
        distFrom52WeekLow: 45.2,
      },
      contractions: [
        {
          index: 1,
          swingHighDate: '2024-01-15',
          swingHighPrice: 45.2,
          swingLowDate: '2024-02-10',
          swingLowPrice: 41.85,
          depthPct: 7.43,
          durationDays: 25,
          avgVolume: 125000,
        },
      ],
      pullbacks: [],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: mockVcpData,
        chart: mockChart as IChartApi,
        series: mockSeries as ISeriesApi<'Candlestick'>,
        visible: true,
      })
    );

    expect(result.current.visibleLabels).toHaveLength(1);
    expect(result.current.visibleLabels[0].text).toBe('C1: 7.4%');
  });

  it('should not be loading after initial render', () => {
    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: null,
        chart: mockChart as IChartApi,
        series: mockSeries as ISeriesApi<'Candlestick'>,
        visible: true,
      })
    );

    expect(result.current.isLoading).toBe(false);
  });
});
