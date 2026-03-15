/**
 * VCP Overlay Helper Functions
 * 
 * Utility functions for VCP chart overlay:
 * - Data conversion
 * - Coordinate mapping
 * - Visible range filtering
 * - Tooltip formatting
 */

import type { IChartApi, ISeriesApi, Time, LogicalRange } from 'lightweight-charts';
import type {
  VcpAnalysis,
  VcpDetailResponse,
  Contraction,
  PullbackWithStatus,
  VcpLineData,
  VcpPoint,
  VcpMarkerData,
  VcpLabelData,
  VcpTooltipContent,
  VCP_LINE_STYLES,
} from '../types/vcp';

// ============================================================================
// Data Type Conversion (VcpDetailResponse → VcpAnalysis)
// ============================================================================

/**
 * Convert VcpDetailResponse to VcpAnalysis format
 * VcpDetailResponse uses flat structure, VcpAnalysis uses nested summary
 */
export function convertVcpDetailToAnalysis(detail: VcpDetailResponse): VcpAnalysis {
  const scanDate = new Date(detail.scanDate);
  const currentDate = new Date();

  // Convert Pullback[] to PullbackWithStatus[]
  const pullbacks: PullbackWithStatus[] = (detail.pullbacks || []).map((p) => {
    const lowDate = new Date(p.lowDate);
    const daysSinceLow = Math.floor((currentDate.getTime() - lowDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...p,
      daysSinceLow: Math.max(0, daysSinceLow),
    };
  });

  // Check if currently in pullback (last pullback with daysSinceLow < 7)
  const inPullback = pullbacks.length > 0 && pullbacks[pullbacks.length - 1].daysSinceLow < 7;

  return {
    stockCode: detail.stockCode,
    stockName: detail.stockName,
    market: 'SH', // Default - not in VcpDetailResponse
    currency: 'CNY', // Default - not in VcpDetailResponse
    scanDate: detail.scanDate,
    cached: false,
    isExpired: false,
    hasVcp: detail.trendTemplate.allPass && detail.contractionCount >= 3,
    summary: {
      contractionCount: detail.contractionCount,
      lastContractionPct: detail.lastContractionPct,
      volumeDryingUp: detail.volumeDryingUp,
      rsRating: detail.rsRating,
      inPullback,
      pullbackCount: detail.pullbacks?.length || 0,
      latestPrice: 0, // Not in VcpDetailResponse
      priceChangePct: 0, // Not in VcpDetailResponse
      distFrom52WeekHigh: 0, // Not in VcpDetailResponse
      distFrom52WeekLow: 0, // Not in VcpDetailResponse
    },
    contractions: detail.contractions,
    pullbacks,
    klines: [], // Not in VcpDetailResponse
    trendTemplate: {
      pass: detail.trendTemplate.allPass,
      checks: detail.trendTemplate.checks.map((c) => ({
        name: c.name,
        pass: c.pass,
        description: `Current: ${c.currentValue.toFixed(2)}, Threshold: ${c.threshold.toFixed(2)}`,
      })),
    },
  };
}

// ============================================================================
// Data Conversion Functions (T008)
// ============================================================================

/**
 * Convert VCP analysis data to unified line data format
 */
export function convertToVcpLineData(
  contractions: Contraction[],
  pullbacks: PullbackWithStatus[]
): VcpLineData[] {
  const contractionLines: VcpLineData[] = contractions.map((c) => ({
    id: `C-${c.index}`,
    type: 'contraction' as const,
    index: c.index,
    startPoint: { date: c.swingHighDate, price: c.swingHighPrice },
    endPoint: { date: c.swingLowDate, price: c.swingLowPrice },
    depthPercent: c.depthPct,
    durationDays: c.durationDays,
    avgVolume: c.avgVolume,
  }));

  const pullbackLines: VcpLineData[] = pullbacks.map((p) => ({
    id: `P-${p.index}`,
    type: 'pullback' as const,
    index: p.index,
    startPoint: { date: p.highDate, price: p.highPrice },
    endPoint: { date: p.lowDate, price: p.lowPrice },
    depthPercent: p.pullbackPct,
    durationDays: p.durationDays,
    avgVolume: p.avgVolume,
    status: p.daysSinceLow === 0 ? 'active' : 'completed',
    daysSinceLow: p.daysSinceLow,
    isInUptrend: p.isInUptrend,
  }));

  return [...contractionLines, ...pullbackLines];
}

/**
 * Generate marker data from line data
 */
export function generateMarkers(lines: VcpLineData[]): VcpMarkerData[] {
  const markers: VcpMarkerData[] = [];

  lines.forEach((line) => {
    const color = getLineStyle(line).color;

    markers.push({
      id: `${line.id}-high`,
      type: 'swing-high',
      lineId: line.id,
      point: line.startPoint,
      color,
      radius: 4,
    });

    markers.push({
      id: `${line.id}-low`,
      type: 'swing-low',
      lineId: line.id,
      point: line.endPoint,
      color,
      radius: 4,
    });
  });

  return markers;
}

/**
 * Generate label data from line data
 */
export function generateLabels(lines: VcpLineData[]): VcpLabelData[] {
  return lines.map((line) => {
    const midPoint = calculateMidpoint(line.startPoint, line.endPoint);
    const prefix = line.type === 'contraction' ? 'C' : 'P';
    const text = `${prefix}${line.index}: ${line.depthPercent.toFixed(1)}%`;

    return {
      id: `${line.id}-label`,
      lineId: line.id,
      text,
      position: midPoint,
      color: getLineStyle(line).color,
      fontSize: 11,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
    };
  });
}

/**
 * Get line style based on line data
 */
export function getLineStyle(line: VcpLineData): typeof VCP_LINE_STYLES[string] {
  if (line.type === 'contraction') {
    return {
      color: '#2563eb',
      lineWidth: 2,
      dashArray: [8, 4] as [number, number],
      opacity: 0.8,
    };
  } else {
    // pullback
    if (line.status === 'active') {
      return {
        color: '#fb923c',
        lineWidth: 2,
        dashArray: [5, 5] as [number, number],
        opacity: 0.9,
      };
    } else {
      return {
        color: '#f59e0b',
        lineWidth: 2,
        dashArray: [5, 5] as [number, number],
        opacity: 0.7,
      };
    }
  }
}

// ============================================================================
// Coordinate Mapping Functions (T007)
// ============================================================================

/**
 * Line coordinates in pixel space
 */
export interface VcpLineCoordinates {
  x1: number; // Time coordinate (pixels)
  y1: number; // Price coordinate (pixels)
  x2: number;
  y2: number;
}

/**
 * Map VCP line data to pixel coordinates
 * Returns null if line is not in visible range
 */
export function mapVcpToCoordinates(
  line: VcpLineData,
  chart: IChartApi,
  series: ISeriesApi<'Candlestick'>
): VcpLineCoordinates | null {
  const timeScale = chart.timeScale();

  // Convert dates to time coordinates
  const x1 = timeScale.timeToCoordinate(line.startPoint.date as Time);
  const x2 = timeScale.timeToCoordinate(line.endPoint.date as Time);

  // Convert prices to price coordinates
  const y1 = series.priceToCoordinate(line.startPoint.price);
  const y2 = series.priceToCoordinate(line.endPoint.price);

  // Check if line is in visible range
  if (x1 === null || x2 === null || y1 === null || y2 === null) {
    return null; // Not in visible range
  }

  return {
    x1: Math.round(x1),
    y1: Math.round(y1),
    x2: Math.round(x2),
    y2: Math.round(y2),
  };
}

/**
 * Calculate midpoint between two VCP points
 * Note: This returns a midpoint in data space (date/price)
 * For pixel midpoint, use the coordinates version
 */
export function calculateMidpoint(start: VcpPoint, end: VcpPoint): VcpPoint {
  // Price midpoint
  const midPrice = (start.price + end.price) / 2;

  // Date midpoint (approximate - uses start date for simplicity)
  // In practice, this should calculate the actual date midpoint
  // but for labels, we only need the price midpoint to be accurate
  const startDate = new Date(start.date);
  const endDate = new Date(end.date);
  const midTime = (startDate.getTime() + endDate.getTime()) / 2;
  const midDate = new Date(midTime).toISOString().split('T')[0];

  return {
    date: midDate,
    price: midPrice,
  };
}

/**
 * Calculate pixel midpoint from coordinates
 */
export function calculatePixelMidpoint(coords: VcpLineCoordinates): { x: number; y: number } {
  return {
    x: Math.round((coords.x1 + coords.x2) / 2),
    y: Math.round((coords.y1 + coords.y2) / 2),
  };
}

// ============================================================================
// Visible Range Filtering Functions (T009)
// ============================================================================

/**
 * Filter VCP data to only visible items
 */
export function getVisibleVcpData(
  lines: VcpLineData[],
  visibleRange: LogicalRange | null
): VcpLineData[] {
  if (!visibleRange) {
    return lines;
  }

  return lines.filter((line) => {
    // Check if line intersects with visible range
    // For now, we'll return all lines and let coordinate mapping handle visibility
    // A more sophisticated approach would convert dates to logical indices
    return true;
  });
}

/**
 * Check if a date range intersects with visible logical range
 * Note: This is a simplified version - full implementation would need
 * to convert dates to logical indices
 */
export function isIntersecting(
  startDate: string,
  endDate: string,
  visibleRange: LogicalRange
): boolean {
  // Simplified: always return true for now
  // Proper implementation requires converting dates to logical indices
  // which depends on the chart's data
  return true;
}

// ============================================================================
// Tooltip Functions (T010)
// ============================================================================

/**
 * Adjust tooltip position to avoid boundary overflow
 */
export function adjustTooltipPosition(
  mouseX: number,
  mouseY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  chartBounds: DOMRect
): { x: number; y: number } {
  let x = mouseX + 10; // Default offset 10px to the right
  let y = mouseY + 10; // Default offset 10px below

  // Right edge overflow → move to left of mouse
  if (x + tooltipWidth > chartBounds.right) {
    x = mouseX - tooltipWidth - 10;
  }

  // Bottom edge overflow → move above mouse
  if (y + tooltipHeight > chartBounds.bottom) {
    y = mouseY - tooltipHeight - 10;
  }

  // Left edge overflow → stick to left boundary
  if (x < chartBounds.left) {
    x = chartBounds.left + 5;
  }

  // Top edge overflow → stick to top boundary
  if (y < chartBounds.top) {
    y = chartBounds.top + 5;
  }

  return { x, y };
}

/**
 * Format tooltip content from line data
 */
export function formatTooltipContent(line: VcpLineData): VcpTooltipContent {
  const typeLabel = line.type === 'contraction' ? 'Contraction' : 'Pullback';

  const content: VcpTooltipContent = {
    title: `${typeLabel} #${line.index}`,
    depth: `Depth: ${line.depthPercent.toFixed(2)}%`,
    duration: `Duration: ${line.durationDays} days`,
    avgVolume: `Avg Volume: ${(line.avgVolume / 10000).toFixed(1)}K`,
    dateRange: `${line.startPoint.date} → ${line.endPoint.date}`,
    priceRange: `¥${line.startPoint.price.toFixed(2)} → ¥${line.endPoint.price.toFixed(2)}`,
  };

  if (line.type === 'pullback') {
    content.additionalInfo = [
      `Days Since Low: ${line.daysSinceLow}`,
      `In Uptrend: ${line.isInUptrend ? 'Yes' : 'No'}`,
      `Status: ${line.status === 'active' ? 'Active' : 'Completed'}`,
    ];
  }

  return content;
}

/**
 * Check if a point is near a line (for hit detection)
 * @param mouseX Mouse X coordinate
 * @param mouseY Mouse Y coordinate
 * @param lineCoords Line coordinates
 * @param threshold Distance threshold (default 5px)
 */
export function isPointNearLine(
  mouseX: number,
  mouseY: number,
  lineCoords: VcpLineCoordinates,
  threshold: number = 5
): boolean {
  // Calculate distance from point to line segment
  const { x1, y1, x2, y2 } = lineCoords;

  // Vector from line start to end
  const lineVecX = x2 - x1;
  const lineVecY = y2 - y1;
  const lineLengthSq = lineVecX * lineVecX + lineVecY * lineVecY;

  if (lineLengthSq === 0) {
    // Line is actually a point
    const dist = Math.sqrt((mouseX - x1) ** 2 + (mouseY - y1) ** 2);
    return dist <= threshold;
  }

  // Project mouse point onto line
  const t = Math.max(
    0,
    Math.min(1, ((mouseX - x1) * lineVecX + (mouseY - y1) * lineVecY) / lineLengthSq)
  );

  // Find closest point on line
  const closestX = x1 + t * lineVecX;
  const closestY = y1 + t * lineVecY;

  // Calculate distance
  const distance = Math.sqrt((mouseX - closestX) ** 2 + (mouseY - closestY) ** 2);

  return distance <= threshold;
}
