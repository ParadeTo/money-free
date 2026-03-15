/**
 * VCP Overlay Helpers Tests
 * T012: Unit tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  convertToVcpLineData,
  calculateMidpoint,
  generateMarkers,
  generateLabels,
  getLineStyle,
  adjustTooltipPosition,
  formatTooltipContent,
  isPointNearLine,
} from '../../src/utils/vcpOverlayHelpers';
import type { Contraction, PullbackWithStatus, VcpLineData } from '../../src/types/vcp';

describe('convertToVcpLineData', () => {
  it('should convert contractions to VcpLineData format', () => {
    const contractions: Contraction[] = [
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
    ];

    const result = convertToVcpLineData(contractions, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'C-1',
      type: 'contraction',
      index: 1,
      startPoint: { date: '2024-01-15', price: 45.2 },
      endPoint: { date: '2024-02-10', price: 41.85 },
      depthPercent: 7.43,
      durationDays: 25,
      avgVolume: 125000,
    });
  });

  it('should convert pullbacks to VcpLineData format with status', () => {
    const pullbacks: PullbackWithStatus[] = [
      {
        index: 1,
        highDate: '2024-03-01',
        highPrice: 48.5,
        lowDate: '2024-03-15',
        lowPrice: 46.2,
        pullbackPct: 4.74,
        durationDays: 14,
        avgVolume: 95000,
        isInUptrend: true,
        daysSinceLow: 0,
      },
      {
        index: 2,
        highDate: '2024-04-01',
        highPrice: 50.0,
        lowDate: '2024-04-10',
        lowPrice: 48.0,
        pullbackPct: 4.0,
        durationDays: 9,
        avgVolume: 88000,
        isInUptrend: true,
        daysSinceLow: 5,
      },
    ];

    const result = convertToVcpLineData([], pullbacks);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('pullback');
    expect(result[0].status).toBe('active'); // daysSinceLow === 0
    expect(result[1].status).toBe('completed'); // daysSinceLow > 0
  });

  it('should handle mixed contractions and pullbacks', () => {
    const contractions: Contraction[] = [
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
    ];

    const pullbacks: PullbackWithStatus[] = [
      {
        index: 1,
        highDate: '2024-03-01',
        highPrice: 48.5,
        lowDate: '2024-03-15',
        lowPrice: 46.2,
        pullbackPct: 4.74,
        durationDays: 14,
        avgVolume: 95000,
        isInUptrend: true,
        daysSinceLow: 3,
      },
    ];

    const result = convertToVcpLineData(contractions, pullbacks);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('contraction');
    expect(result[1].type).toBe('pullback');
  });
});

describe('calculateMidpoint', () => {
  it('should calculate midpoint between two points', () => {
    const start = { date: '2024-01-15', price: 45.2 };
    const end = { date: '2024-02-10', price: 41.8 };

    const result = calculateMidpoint(start, end);

    expect(result.price).toBeCloseTo((45.2 + 41.8) / 2, 2);
    expect(result.date).toBeDefined();
    // Date should be between start and end
    const startTime = new Date(start.date).getTime();
    const endTime = new Date(end.date).getTime();
    const midTime = new Date(result.date).getTime();
    expect(midTime).toBeGreaterThanOrEqual(startTime);
    expect(midTime).toBeLessThanOrEqual(endTime);
  });
});

describe('generateMarkers', () => {
  it('should generate two markers per line (swing high and low)', () => {
    const lines: VcpLineData[] = [
      {
        id: 'C-1',
        type: 'contraction',
        index: 1,
        startPoint: { date: '2024-01-15', price: 45.2 },
        endPoint: { date: '2024-02-10', price: 41.85 },
        depthPercent: 7.43,
        durationDays: 25,
        avgVolume: 125000,
      },
    ];

    const result = generateMarkers(lines);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('swing-high');
    expect(result[0].point).toEqual({ date: '2024-01-15', price: 45.2 });
    expect(result[1].type).toBe('swing-low');
    expect(result[1].point).toEqual({ date: '2024-02-10', price: 41.85 });
  });

  it('should assign correct colors to markers based on line type', () => {
    const lines: VcpLineData[] = [
      {
        id: 'C-1',
        type: 'contraction',
        index: 1,
        startPoint: { date: '2024-01-15', price: 45.2 },
        endPoint: { date: '2024-02-10', price: 41.85 },
        depthPercent: 7.43,
        durationDays: 25,
        avgVolume: 125000,
      },
      {
        id: 'P-1',
        type: 'pullback',
        index: 1,
        startPoint: { date: '2024-03-01', price: 48.5 },
        endPoint: { date: '2024-03-15', price: 46.2 },
        depthPercent: 4.74,
        durationDays: 14,
        avgVolume: 95000,
        status: 'completed',
      },
    ];

    const result = generateMarkers(lines);

    expect(result).toHaveLength(4);
    // Contraction markers should be blue
    expect(result[0].color).toBe('#2563eb');
    expect(result[1].color).toBe('#2563eb');
    // Pullback markers should be orange
    expect(result[2].color).toBe('#f59e0b');
    expect(result[3].color).toBe('#f59e0b');
  });
});

describe('generateLabels', () => {
  it('should generate label with correct text format', () => {
    const lines: VcpLineData[] = [
      {
        id: 'C-1',
        type: 'contraction',
        index: 1,
        startPoint: { date: '2024-01-15', price: 45.2 },
        endPoint: { date: '2024-02-10', price: 41.85 },
        depthPercent: 7.43,
        durationDays: 25,
        avgVolume: 125000,
      },
      {
        id: 'P-1',
        type: 'pullback',
        index: 1,
        startPoint: { date: '2024-03-01', price: 48.5 },
        endPoint: { date: '2024-03-15', price: 46.2 },
        depthPercent: 4.74,
        durationDays: 14,
        avgVolume: 95000,
        status: 'completed',
      },
    ];

    const result = generateLabels(lines);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('C1: 7.4%');
    expect(result[1].text).toBe('P1: 4.7%');
  });

  it('should position labels at line midpoint', () => {
    const lines: VcpLineData[] = [
      {
        id: 'C-1',
        type: 'contraction',
        index: 1,
        startPoint: { date: '2024-01-15', price: 50.0 },
        endPoint: { date: '2024-02-10', price: 40.0 },
        depthPercent: 20.0,
        durationDays: 25,
        avgVolume: 125000,
      },
    ];

    const result = generateLabels(lines);

    expect(result[0].position.price).toBe(45.0); // (50 + 40) / 2
  });
});

describe('getLineStyle', () => {
  it('should return blue style for contractions', () => {
    const line: VcpLineData = {
      id: 'C-1',
      type: 'contraction',
      index: 1,
      startPoint: { date: '2024-01-15', price: 45.2 },
      endPoint: { date: '2024-02-10', price: 41.85 },
      depthPercent: 7.43,
      durationDays: 25,
      avgVolume: 125000,
    };

    const result = getLineStyle(line);

    expect(result.color).toBe('#2563eb');
    expect(result.dashArray).toEqual([8, 4]);
  });

  it('should return bright orange for active pullbacks', () => {
    const line: VcpLineData = {
      id: 'P-1',
      type: 'pullback',
      index: 1,
      startPoint: { date: '2024-03-01', price: 48.5 },
      endPoint: { date: '2024-03-15', price: 46.2 },
      depthPercent: 4.74,
      durationDays: 14,
      avgVolume: 95000,
      status: 'active',
    };

    const result = getLineStyle(line);

    expect(result.color).toBe('#fb923c');
  });

  it('should return standard orange for completed pullbacks', () => {
    const line: VcpLineData = {
      id: 'P-1',
      type: 'pullback',
      index: 1,
      startPoint: { date: '2024-03-01', price: 48.5 },
      endPoint: { date: '2024-03-15', price: 46.2 },
      depthPercent: 4.74,
      durationDays: 14,
      avgVolume: 95000,
      status: 'completed',
    };

    const result = getLineStyle(line);

    expect(result.color).toBe('#f59e0b');
  });
});

describe('adjustTooltipPosition', () => {
  const chartBounds = {
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;

  it('should position tooltip to the right and below mouse by default', () => {
    const result = adjustTooltipPosition(100, 100, 200, 100, chartBounds);

    expect(result.x).toBe(110); // mouseX + 10
    expect(result.y).toBe(110); // mouseY + 10
  });

  it('should flip tooltip to left when overflowing right edge', () => {
    const result = adjustTooltipPosition(750, 100, 200, 100, chartBounds);

    expect(result.x).toBeLessThan(750); // Should be to the left of mouse
    expect(result.x).toBe(750 - 200 - 10); // mouseX - width - 10
  });

  it('should flip tooltip above when overflowing bottom edge', () => {
    const result = adjustTooltipPosition(100, 550, 200, 100, chartBounds);

    expect(result.y).toBeLessThan(550); // Should be above mouse
    expect(result.y).toBe(550 - 100 - 10); // mouseY - height - 10
  });

  it('should stick to left boundary when flipped position overflows left', () => {
    const result = adjustTooltipPosition(50, 100, 200, 100, chartBounds);

    expect(result.x).toBe(60); // mouseX + 10 (not flipped)
  });
});

describe('formatTooltipContent', () => {
  it('should format contraction tooltip content correctly', () => {
    const line: VcpLineData = {
      id: 'C-1',
      type: 'contraction',
      index: 1,
      startPoint: { date: '2024-01-15', price: 45.2 },
      endPoint: { date: '2024-02-10', price: 41.85 },
      depthPercent: 7.43,
      durationDays: 25,
      avgVolume: 125000,
    };

    const result = formatTooltipContent(line);

    expect(result.title).toBe('Contraction #1');
    expect(result.depth).toBe('Depth: 7.43%');
    expect(result.duration).toBe('Duration: 25 days');
    expect(result.avgVolume).toBe('Avg Volume: 12.5K');
    expect(result.dateRange).toBe('2024-01-15 → 2024-02-10');
    expect(result.priceRange).toBe('¥45.20 → ¥41.85');
    expect(result.additionalInfo).toBeUndefined();
  });

  it('should format pullback tooltip with additional info', () => {
    const line: VcpLineData = {
      id: 'P-1',
      type: 'pullback',
      index: 1,
      startPoint: { date: '2024-03-01', price: 48.5 },
      endPoint: { date: '2024-03-15', price: 46.2 },
      depthPercent: 4.74,
      durationDays: 14,
      avgVolume: 95000,
      status: 'active',
      daysSinceLow: 0,
      isInUptrend: true,
    };

    const result = formatTooltipContent(line);

    expect(result.title).toBe('Pullback #1');
    expect(result.additionalInfo).toHaveLength(3);
    expect(result.additionalInfo![0]).toBe('Days Since Low: 0');
    expect(result.additionalInfo![1]).toBe('In Uptrend: Yes');
    expect(result.additionalInfo![2]).toBe('Status: Active');
  });
});

describe('isPointNearLine', () => {
  it('should return true when point is within threshold of line', () => {
    const lineCoords = { x1: 100, y1: 100, x2: 200, y2: 200 };

    // Point on the line
    const result = isPointNearLine(150, 150, lineCoords, 5);

    expect(result).toBe(true);
  });

  it('should return false when point is far from line', () => {
    const lineCoords = { x1: 100, y1: 100, x2: 200, y2: 200 };

    // Point far from line
    const result = isPointNearLine(300, 300, lineCoords, 5);

    expect(result).toBe(false);
  });

  it('should work with horizontal lines', () => {
    const lineCoords = { x1: 100, y1: 150, x2: 200, y2: 150 };

    const result = isPointNearLine(150, 152, lineCoords, 5);

    expect(result).toBe(true);
  });

  it('should work with vertical lines', () => {
    const lineCoords = { x1: 150, y1: 100, x2: 150, y2: 200 };

    const result = isPointNearLine(152, 150, lineCoords, 5);

    expect(result).toBe(true);
  });
});
