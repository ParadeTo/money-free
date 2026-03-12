/**
 * Mock Services Utilities for VCP Analysis Testing
 * 
 * Provides mock implementations of VCP-related services for unit testing.
 */

import { VcpAnalysisResult, ContractionResult, PullbackResult, KLineBar } from '../../src/services/vcp/vcp-analyzer.service';

/**
 * Create a mock VcpAnalyzerService
 */
export const createMockVcpAnalyzer = (overrides?: Partial<VcpAnalysisResult>) => {
  const defaultResult: VcpAnalysisResult = {
    hasVcp: true,
    contractions: [
      {
        index: 1,
        swingHighDate: '2025-11-15',
        swingHighPrice: 48.50,
        swingLowDate: '2025-11-30',
        swingLowPrice: 31.53,
        depthPct: 35.00,
        durationDays: 15,
        avgVolume: 1250000,
      },
      {
        index: 2,
        swingHighDate: '2025-12-10',
        swingHighPrice: 46.20,
        swingLowDate: '2025-12-22',
        swingLowPrice: 36.96,
        depthPct: 20.00,
        durationDays: 12,
        avgVolume: 980000,
      },
      {
        index: 3,
        swingHighDate: '2026-01-08',
        swingHighPrice: 45.00,
        swingLowDate: '2026-01-18',
        swingLowPrice: 39.42,
        depthPct: 12.40,
        durationDays: 10,
        avgVolume: 750000,
      },
    ],
    contractionCount: 3,
    lastContractionPct: 12.40,
    volumeDryingUp: true,
    pullbacks: [
      {
        index: 1,
        highDate: '2026-02-15',
        highPrice: 47.80,
        lowDate: '2026-02-20',
        lowPrice: 44.06,
        pullbackPct: 7.82,
        durationDays: 5,
        avgVolume: 850000,
        isInUptrend: true,
      },
    ],
    ...overrides,
  };

  return {
    analyze: jest.fn().mockResolvedValue(defaultResult),
  };
};

/**
 * Create mock K-line data
 */
export const createMockKLineData = (count: number = 300): KLineBar[] => {
  const klines: KLineBar[] = [];
  const startDate = new Date('2025-06-01');
  let price = 30;

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const change = (Math.random() - 0.5) * 2; // -1 to 1
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    const volume = 500000 + Math.random() * 500000;

    klines.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return klines;
};

/**
 * Create mock VcpScanResult from database
 */
export const createMockVcpScanResult = (overrides?: any) => {
  return {
    id: 1,
    stockCode: '605117',
    scanDate: new Date('2026-03-11'),
    trendTemplatePass: true,
    contractionCount: 3,
    lastContractionPct: 12.40,
    volumeDryingUp: true,
    rsRating: 85,
    inPullback: false,
    pullbackCount: 2,
    latestPrice: 45.67,
    priceChangePct: 2.15,
    distFrom52WeekHigh: -5.23,
    distFrom52WeekLow: 68.45,
    contractions: JSON.stringify([
      {
        index: 1,
        swingHighDate: '2025-11-15',
        swingHighPrice: 48.50,
        swingLowDate: '2025-11-30',
        swingLowPrice: 31.53,
        depthPct: 35.00,
        durationDays: 15,
        avgVolume: 1250000,
      },
      {
        index: 2,
        swingHighDate: '2025-12-10',
        swingHighPrice: 46.20,
        swingLowDate: '2025-12-22',
        swingLowPrice: 36.96,
        depthPct: 20.00,
        durationDays: 12,
        avgVolume: 980000,
      },
      {
        index: 3,
        swingHighDate: '2026-01-08',
        swingHighPrice: 45.00,
        swingLowDate: '2026-01-18',
        swingLowPrice: 39.42,
        depthPct: 12.40,
        durationDays: 10,
        avgVolume: 750000,
      },
    ]),
    trendTemplateDetails: JSON.stringify({
      pass: true,
      checks: [
        { name: 'uptrend', pass: true, message: '股价处于上升趋势' },
        { name: 'priceAboveMA', pass: true, message: '价格位于移动平均线之上' },
      ],
    }),
    lastPullbackData: JSON.stringify({
      highDate: '2026-02-15',
      highPrice: 47.80,
      lowDate: '2026-02-20',
      lowPrice: 44.06,
      pullbackPct: 7.82,
      durationDays: 5,
      avgVolume: 850000,
      isInUptrend: true,
    }),
    ...overrides,
  };
};

/**
 * Create mock Stock entity
 */
export const createMockStock = (overrides?: any) => {
  return {
    id: 1,
    stockCode: '605117',
    stockName: '德业股份',
    listDate: new Date('2021-03-15'),
    delistDate: null,
    ...overrides,
  };
};

/**
 * Create mock PrismaService
 */
export const createMockPrismaService = () => {
  return {
    stock: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    vcpScanResult: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    kLineData: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
};
