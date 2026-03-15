/**
 * useVcpOverlay Hook
 * T016: Core logic for VCP overlay (data conversion, filtering, coordinate mapping)
 */

import { useMemo, useEffect, useState } from 'react';
import type { IChartApi, ISeriesApi, LogicalRange } from 'lightweight-charts';
import type {
  VcpAnalysis,
  VcpLineData,
  VcpMarkerData,
  VcpLabelData,
} from '../types/vcp';
import {
  convertToVcpLineData,
  generateMarkers,
  generateLabels,
  getVisibleVcpData,
} from '../utils/vcpOverlayHelpers';

export interface UseVcpOverlayParams {
  /** VCP analysis data */
  vcpData: VcpAnalysis | null;

  /** Chart instance */
  chart: IChartApi | null;

  /** Candlestick series */
  series: ISeriesApi<'Candlestick'> | null;

  /** Visibility */
  visible: boolean;
}

export interface UseVcpOverlayReturn {
  /** All lines (unfiltered) */
  allLines: VcpLineData[];

  /** Visible lines in current range */
  visibleLines: VcpLineData[];

  /** Visible markers in current range */
  visibleMarkers: VcpMarkerData[];

  /** Visible labels in current range */
  visibleLabels: VcpLabelData[];

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;

  /** Manually recalculate */
  recalculate: () => void;
}

export function useVcpOverlay({
  vcpData,
  chart,
  series,
  visible,
}: UseVcpOverlayParams): UseVcpOverlayReturn {
  const [visibleRange, setVisibleRange] = useState<LogicalRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convert VCP data to line data
  const allLines = useMemo(() => {
    if (!vcpData || !visible) {
      return [];
    }

    try {
      return convertToVcpLineData(vcpData.contractions, vcpData.pullbacks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert VCP data');
      return [];
    }
  }, [vcpData, visible]);

  // Subscribe to visible range changes
  useEffect(() => {
    if (!chart || !visible) {
      return;
    }

    const timeScale = chart.timeScale();

    // Get initial range
    const initialRange = timeScale.getVisibleLogicalRange();
    setVisibleRange(initialRange);

    // Subscribe to range changes
    const handleRangeChange = (range: LogicalRange | null) => {
      setVisibleRange(range);
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chart, visible]);

  // Filter lines by visible range
  const visibleLines = useMemo(() => {
    if (!visible || allLines.length === 0) {
      return [];
    }

    return getVisibleVcpData(allLines, visibleRange);
  }, [allLines, visibleRange, visible]);

  // Generate markers from visible lines
  const visibleMarkers = useMemo(() => {
    if (!visible || visibleLines.length === 0) {
      return [];
    }

    try {
      return generateMarkers(visibleLines);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate markers');
      return [];
    }
  }, [visibleLines, visible]);

  // Generate labels from visible lines
  const visibleLabels = useMemo(() => {
    if (!visible || visibleLines.length === 0) {
      return [];
    }

    try {
      return generateLabels(visibleLines);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate labels');
      return [];
    }
  }, [visibleLines, visible]);

  const recalculate = () => {
    if (chart) {
      const timeScale = chart.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      setVisibleRange(range);
    }
  };

  return {
    allLines,
    visibleLines,
    visibleMarkers,
    visibleLabels,
    isLoading: false,
    error,
    recalculate,
  };
}
