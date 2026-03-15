/**
 * VcpOverlayLayer Component
 * T018-T019: Series Primitive integration, label rendering
 */

import { useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, ISeriesPrimitive, SeriesAttachedParameter, MouseEventParams, Time } from 'lightweight-charts';
import type { CanvasRenderingTarget2D } from 'fancy-canvas';
import type { VcpAnalysis, VcpLineData } from '../../types/vcp';
import { useVcpOverlay } from '../../hooks/useVcpOverlay';
import { mapVcpToCoordinates, isPointNearLine } from '../../utils/vcpOverlayHelpers';
import { drawVcpLines, drawVcpMarker, drawVcpLabel } from './VcpLine';
import type { VcpLineCoordinates } from './VcpLine';
import { VcpTooltip } from './VcpTooltip';
import { VcpStatusBadge } from './VcpStatusBadge';

export interface VcpOverlayLayerProps {
  /** VCP analysis data */
  vcpData: VcpAnalysis | null;

  /** Chart instance */
  chart: IChartApi;

  /** Candlestick series */
  series: ISeriesApi<'Candlestick'>;

  /** Visibility */
  visible: boolean;
}

/**
 * VCP Overlay Layer Component
 * Uses lightweight-charts Series Primitives API for custom drawing
 */
export function VcpOverlayLayer({
  vcpData,
  chart,
  series,
  visible,
}: VcpOverlayLayerProps) {
  
  const primitiveRef = useRef<ISeriesPrimitive<Time> | null>(null);
  const isPrimitiveAttachedRef = useRef(false);  // Track if primitive is currently attached
  const attachedSeriesRef = useRef<typeof series | null>(null); // Track which series the primitive is attached to
  const hasInitialScrolledRef = useRef(false); // Track if we've done initial scroll to VCP data
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredLine, setHoveredLine] = useState<VcpLineData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [chartBounds, setChartBounds] = useState<DOMRect | null>(null);

  // Use VCP overlay hook
  const { allLines, visibleLines, visibleMarkers, visibleLabels } = useVcpOverlay({
    vcpData,
    chart,
    series,
    visible,
  });

  // Keep chart and series references stable to avoid unnecessary effect re-runs
  const chartRef = useRef(chart);
  const seriesRef = useRef(series);
  useEffect(() => {
    chartRef.current = chart;
    seriesRef.current = series;
  }, [chart, series]);
  
  // Create primitive once and keep it stable - avoid frequent recreation
  const primitiveInstanceRef = useRef<VcpPrimitive | null>(null);
  
  // Initialize primitive once on mount
  if (!primitiveInstanceRef.current) {
    primitiveInstanceRef.current = new VcpPrimitive(visibleLines, visibleMarkers, visibleLabels, chart, series);
  }
  
  useEffect(() => {
    // Only update if primitive exists AND is currently attached
    if (primitiveInstanceRef.current && isPrimitiveAttachedRef.current && (visibleLines.length > 0 || visibleMarkers.length > 0 || visibleLabels.length > 0)) {
      primitiveInstanceRef.current.updateData(visibleLines, visibleMarkers, visibleLabels);
      primitiveInstanceRef.current.requestUpdate();
    }
  }, [visibleLines, visibleMarkers, visibleLabels]);

  // Attach/detach primitive - re-run when series changes (e.g. after period switch)
  useEffect(() => {
    const currentSeries = series;
    const hasVcpData = !!vcpData;

    // Detach from old series if series changed
    if (primitiveRef.current && isPrimitiveAttachedRef.current && attachedSeriesRef.current !== series) {
      try { attachedSeriesRef.current!.detachPrimitive(primitiveRef.current); } catch (_) {}
      primitiveRef.current = null;
      isPrimitiveAttachedRef.current = false;
      attachedSeriesRef.current = null;
    }

    if (!visible || !hasVcpData) {
      // Detach if exists
      if (primitiveRef.current && isPrimitiveAttachedRef.current && attachedSeriesRef.current) {
        try { attachedSeriesRef.current.detachPrimitive(primitiveRef.current); } catch (_) {}
        primitiveRef.current = null;
        isPrimitiveAttachedRef.current = false;
        attachedSeriesRef.current = null;
      }
      return;
    }

    // Only attach if not already attached
    if (!primitiveRef.current && primitiveInstanceRef.current) {
      const primitive = primitiveInstanceRef.current;
      // Update with latest data before attaching
      primitive.updateData(visibleLines, visibleMarkers, visibleLabels);

      try {
        currentSeries.attachPrimitive(primitive);
        primitiveRef.current = primitive;
        isPrimitiveAttachedRef.current = true;
        attachedSeriesRef.current = currentSeries;
      } catch (err) {
        console.warn('[VcpOverlay] Failed to attach primitive:', err);
        return;
      }

      // Auto-scroll to VCP data on initial load if it's outside visible range
      if (!hasInitialScrolledRef.current && allLines.length > 0) {
        const timeScale = chartRef.current.timeScale();
        const allDates = allLines.flatMap(line => [line.startPoint.date, line.endPoint.date]);
        const sortedDates = allDates.sort();
        const earliestDate = sortedDates[0];
        const latestDate = sortedDates[sortedDates.length - 1];

        const currentVisibleRange = timeScale.getVisibleRange();
        const isVcpOutsideRange = currentVisibleRange && (latestDate < currentVisibleRange.from || earliestDate > currentVisibleRange.to);

        if (isVcpOutsideRange) {
          timeScale.setVisibleRange({
            from: earliestDate as any,
            to: latestDate as any,
          });
          hasInitialScrolledRef.current = true;
        }
      }

      // Explicitly request update after attach to ensure initial render
      primitive.requestUpdate();
    }
  }, [visible, !!vcpData, series]); // Include series to handle chart recreation
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (primitiveRef.current && isPrimitiveAttachedRef.current && attachedSeriesRef.current) {
        try { attachedSeriesRef.current.detachPrimitive(primitiveRef.current); } catch (_) {}
        primitiveRef.current = null;
        isPrimitiveAttachedRef.current = false;
        attachedSeriesRef.current = null;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Note: requestUpdate is now called in the data update effect above
  // No need for separate re-render effect

  // Keep latest visibleLines in a ref to avoid re-subscribing on every change
  const visibleLinesRef = useRef(visibleLines);
  useEffect(() => {
    visibleLinesRef.current = visibleLines;
  }, [visibleLines]);

  // Mouse move handler for hover detection - stable subscription
  useEffect(() => {
    const currentChart = chartRef.current;
    const currentSeries = seriesRef.current;
    
    if (!currentChart || !visible) {
      setHoveredLine(null);
      return;
    }

    const handleMouseMove = (param: MouseEventParams) => {
      const currentVisibleLines = visibleLinesRef.current;
      
      if (!param.point || currentVisibleLines.length === 0) {
        setHoveredLine(null);
        return;
      }

      const { x, y } = param.point;
      setTooltipPosition({ x, y });

      // Check if mouse is near any line
      let foundLine: VcpLineData | null = null;

      for (const line of currentVisibleLines) {
        const coords = mapVcpToCoordinates(line, currentChart, currentSeries);
        if (coords && isPointNearLine(x, y, coords, 8)) {
          foundLine = line;
          break;
        }
      }

      setHoveredLine(foundLine);
    };

    currentChart.subscribeCrosshairMove(handleMouseMove);

    return () => {
      currentChart.unsubscribeCrosshairMove(handleMouseMove);
    };
  }, [visible]);

  // Update chart bounds on mount and resize
  useEffect(() => {
    if (!chart) return;

    const updateBounds = () => {
      // Try to find chart container
      const chartWithElement = chart as { chartElement?: () => HTMLElement };
      const container = chartWithElement.chartElement?.() || document.querySelector('.tv-lightweight-charts');
      if (container) {
        setChartBounds(container.getBoundingClientRect());
        chartContainerRef.current = container as HTMLDivElement;
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);

    return () => {
      window.removeEventListener('resize', updateBounds);
    };
  }, [chart]);

  return (
    <>
      <VcpStatusBadge vcpData={vcpData} visible={visible} />
      <VcpTooltip
        line={hoveredLine}
        position={tooltipPosition}
        chartBounds={chartBounds}
        visible={visible && hoveredLine !== null}
      />
    </>
  );
}

interface VcpMarkerData {
  point: { date: string; price: number };
  color: string;
  radius: number;
}

interface VcpLabelData {
  position: { date: string; price: number };
  text: string;
  color: string;
  fontSize: number;
  backgroundColor: string;
}

/**
 * VCP Primitive View for lightweight-charts
 */
class VcpPrimitiveView {
  private _primitive: VcpPrimitive;
  private _renderer: { draw: (target: CanvasRenderingTarget2D) => void };

  constructor(primitive: VcpPrimitive) {
    this._primitive = primitive;
    
    // Cache renderer object - create it only once to avoid instability
    this._renderer = {
      draw: (target: CanvasRenderingTarget2D) => {
        const chart = this._primitive.getChart();
        const series = this._primitive.getSeries();
        const lines = this._primitive.getLines();
        const markers = this._primitive.getMarkers();
        const labels = this._primitive.getLabels();

        // Get chart visible range
        const timeScale = chart.timeScale();
        const visibleRange = timeScale.getVisibleLogicalRange();
        
        // Map lines to pixel coordinates (done outside canvas scope)
        const coordsMap = new Map<string, VcpLineCoordinates>();
        lines.forEach((line) => {
          const coords = mapVcpToCoordinates(line, chart, series);
          if (coords) {
            coordsMap.set(line.id, coords);
          }
        });
        
        // Early return if nothing to draw
        if (coordsMap.size === 0 && markers.length === 0 && labels.length === 0) {
          return;
        }

        target.useMediaCoordinateSpace((scope) => {
          const ctx = scope.context;

          // Draw lines
          drawVcpLines(ctx, lines, coordsMap);

          // Draw markers
          markers.forEach((marker) => {
            const timeScale = chart.timeScale();
            const x = timeScale.timeToCoordinate(marker.point.date as never);
            const y = series.priceToCoordinate(marker.point.price);

            if (x !== null && y !== null) {
              drawVcpMarker(ctx, x, y, marker.color, marker.radius);
            }
          });

          // Draw labels
          labels.forEach((label) => {
            const timeScale = chart.timeScale();
            const x = timeScale.timeToCoordinate(label.position.date as never);
            const y = series.priceToCoordinate(label.position.price);

            if (x !== null && y !== null) {
              drawVcpLabel(
                ctx,
                label.text,
                x,
                y,
                label.color,
                label.fontSize,
                label.backgroundColor
              );
            }
          });
        });
      },
    };
  }

  renderer(): { draw: (target: CanvasRenderingTarget2D) => void } {
    return this._renderer;
  }
}

class VcpPrimitive implements ISeriesPrimitive<Time> {
  private _lines: VcpLineData[];
  private _markers: VcpMarkerData[];
  private _labels: VcpLabelData[];
  private _chart: IChartApi;
  private _series: ISeriesApi<'Candlestick'>;
  private _requestUpdate?: () => void;
  private _view: VcpPrimitiveView;

  constructor(
    lines: VcpLineData[],
    markers: VcpMarkerData[],
    labels: VcpLabelData[],
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>
  ) {
    this._lines = lines;
    this._markers = markers;
    this._labels = labels;
    this._chart = chart;
    this._series = series;
    this._view = new VcpPrimitiveView(this);
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._requestUpdate = param.requestUpdate;
    // Trigger initial render
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  detached(): void {
    this._requestUpdate = undefined;
  }

  updateData(lines: VcpLineData[], markers: VcpMarkerData[], labels: VcpLabelData[]): void {
    this._lines = lines;
    this._markers = markers;
    this._labels = labels;
  }

  requestUpdate(): void {
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  updateAllViews(): void {
    // Update the view when data changes
    if (this._view && this._requestUpdate) {
      this._requestUpdate();
    }
  }

  paneViews(): readonly VcpPrimitiveView[] {
    return [this._view];
  }

  // Getter methods for the view to access data
  getLines(): VcpLineData[] {
    return this._lines;
  }

  getMarkers(): VcpMarkerData[] {
    return this._markers;
  }

  getLabels(): VcpLabelData[] {
    return this._labels;
  }

  getChart(): IChartApi {
    return this._chart;
  }

  getSeries(): ISeriesApi<'Candlestick'> {
    return this._series;
  }
}
