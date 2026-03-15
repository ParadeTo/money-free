/**
 * VcpLine Drawing Logic Tests
 * T014: Canvas drawing calls, dash styles, color correctness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawVcpLine, drawVcpLines } from '../../../src/components/KLineChart/VcpLine';
import type { VcpLineData, VcpLineCoordinates } from '../../../src/types/vcp';

describe('drawVcpLine', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    };
  });

  it('should draw line with correct coordinates', () => {
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

    const coords: VcpLineCoordinates = {
      x1: 100,
      y1: 150,
      x2: 200,
      y2: 200,
    };

    drawVcpLine(mockCtx, line, coords);

    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 150);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(200, 200);
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should apply correct dash pattern for contractions', () => {
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

    const coords: VcpLineCoordinates = { x1: 100, y1: 150, x2: 200, y2: 200 };

    drawVcpLine(mockCtx, line, coords);

    expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 4]);
    expect(mockCtx.strokeStyle).toBe('#2563eb');
    expect(mockCtx.lineWidth).toBe(2);
    expect(mockCtx.globalAlpha).toBeCloseTo(0.8, 2);
  });

  it('should apply correct style for active pullbacks', () => {
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

    const coords: VcpLineCoordinates = { x1: 150, y1: 180, x2: 250, y2: 220 };

    drawVcpLine(mockCtx, line, coords);

    expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
    expect(mockCtx.strokeStyle).toBe('#fb923c'); // Bright orange for active
    expect(mockCtx.globalAlpha).toBeCloseTo(0.9, 2);
  });

  it('should apply correct style for completed pullbacks', () => {
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

    const coords: VcpLineCoordinates = { x1: 150, y1: 180, x2: 250, y2: 220 };

    drawVcpLine(mockCtx, line, coords);

    expect(mockCtx.strokeStyle).toBe('#f59e0b'); // Standard orange for completed
    expect(mockCtx.globalAlpha).toBeCloseTo(0.7, 2);
  });

  it('should save and restore context', () => {
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

    const coords: VcpLineCoordinates = { x1: 100, y1: 150, x2: 200, y2: 200 };

    drawVcpLine(mockCtx, line, coords);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });
});

describe('drawVcpLines', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    };
  });

  it('should draw multiple lines in batch', () => {
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
        id: 'C-2',
        type: 'contraction',
        index: 2,
        startPoint: { date: '2024-02-20', price: 44.0 },
        endPoint: { date: '2024-03-05', price: 41.5 },
        depthPercent: 5.68,
        durationDays: 14,
        avgVolume: 110000,
      },
    ];

    const coordsMap = new Map<string, VcpLineCoordinates>([
      ['C-1', { x1: 100, y1: 150, x2: 200, y2: 200 }],
      ['C-2', { x1: 220, y1: 160, x2: 280, y2: 205 }],
    ]);

    drawVcpLines(mockCtx, lines, coordsMap);

    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalledTimes(2);
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(2);
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should skip lines without coordinates', () => {
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
        id: 'C-2',
        type: 'contraction',
        index: 2,
        startPoint: { date: '2024-02-20', price: 44.0 },
        endPoint: { date: '2024-03-05', price: 41.5 },
        depthPercent: 5.68,
        durationDays: 14,
        avgVolume: 110000,
      },
    ];

    const coordsMap = new Map<string, VcpLineCoordinates>([
      ['C-1', { x1: 100, y1: 150, x2: 200, y2: 200 }],
      // C-2 not in coordsMap (out of visible range)
    ]);

    drawVcpLines(mockCtx, lines, coordsMap);

    expect(mockCtx.moveTo).toHaveBeenCalledTimes(1); // Only one line drawn
  });
});
