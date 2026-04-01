/**
 * VcpOverlayLayer Component Tests
 * T015: Component rendering, props passing, primitive attachment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { VcpOverlayLayer } from '../../../src/components/KLineChart/VcpOverlayLayer';
import type { VcpAnalysis } from '../../../src/types/vcp';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

describe('VcpOverlayLayer', () => {
  let mockChart: Partial<IChartApi>;
  let mockSeries: Partial<ISeriesApi<'Candlestick'>>;

  beforeEach(() => {
    mockChart = {
      timeScale: vi.fn(() => ({
        timeToCoordinate: vi.fn(() => 100),
        getVisibleLogicalRange: vi.fn(() => ({ from: 0, to: 100 })),
        getVisibleRange: vi.fn(() => ({ from: '2024-01-01', to: '2024-12-31' })),
        subscribeVisibleLogicalRangeChange: vi.fn((callback) => {
          callback({ from: 0, to: 100 });
        }),
        unsubscribeVisibleLogicalRangeChange: vi.fn(),
      })),
      subscribeCrosshairMove: vi.fn(),
      unsubscribeCrosshairMove: vi.fn(),
    } as any;

    mockSeries = {
      priceToCoordinate: vi.fn(() => 200),
      attachPrimitive: vi.fn(),
      detachPrimitive: vi.fn(),
    } as any;
  });

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

  it('should not render anything when vcpData is null', () => {
    const { container } = render(
      <VcpOverlayLayer
        vcpData={null}
        chart={mockChart as IChartApi}
        series={mockSeries as ISeriesApi<'Candlestick'>}
        visible={true}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(mockSeries.attachPrimitive).not.toHaveBeenCalled();
  });

  it('should not render when visible is false', () => {
    const { container } = render(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart as IChartApi}
        series={mockSeries as ISeriesApi<'Candlestick'>}
        visible={false}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(mockSeries.attachPrimitive).not.toHaveBeenCalled();
  });

  it('should attach primitive when visible and has data', () => {
    render(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart as IChartApi}
        series={mockSeries as ISeriesApi<'Candlestick'>}
        visible={true}
      />
    );

    expect(mockSeries.attachPrimitive).toHaveBeenCalled();
  });

  it('should detach primitive on unmount', () => {
    const { unmount } = render(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart as IChartApi}
        series={mockSeries as ISeriesApi<'Candlestick'>}
        visible={true}
      />
    );

    unmount();

    expect(mockSeries.detachPrimitive).toHaveBeenCalled();
  });
});
