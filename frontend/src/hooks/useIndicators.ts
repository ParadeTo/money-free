import { useState, useEffect, useCallback } from 'react';
import { 
  indicatorService, 
  type GetIndicatorsParams, 
  type IndicatorsResponse,
  type Week52Markers 
} from '../services/indicator.service';
import type { TimeRange, SubChartIndicator, VolumeChartIndicator } from '../store/chart.store';
import { getDateRangeFromTimeRange } from '../utils/dateRange';

export function useIndicators(
  stockCode: string, 
  period: 'daily' | 'weekly' = 'daily',
  subChart1Indicator: SubChartIndicator = 'none',
  subChart2Indicator: VolumeChartIndicator = 'none',
  showMA: boolean = false,
  timeRange: TimeRange = '1Y'
) {
  const [data, setData] = useState<IndicatorsResponse | null>(null);
  const [markers, setMarkers] = useState<Week52Markers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (params?: GetIndicatorsParams) => {
    if (!stockCode) {
      setData(null);
      setMarkers(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 根据时间范围计算日期区间
      const { startDate, endDate } = getDateRangeFromTimeRange(timeRange);
      
      // 根据选择的副图和均线构建指标列表
      const requestedIndicators: string[] = [];
      if (showMA) {
        requestedIndicators.push('ma');
      }
      if (subChart1Indicator !== 'none') {
        requestedIndicators.push(subChart1Indicator);
      }
      if (subChart2Indicator !== 'none') {
        requestedIndicators.push(subChart2Indicator);
      }
      
      const [indicatorsResponse, markersResponse] = await Promise.all([
        requestedIndicators.length > 0 
          ? indicatorService.getIndicators(stockCode, {
              period,
              indicators: requestedIndicators,
              startDate,
              endDate,
              ...params,
            })
          : Promise.resolve({ stockCode, period, data: [], count: 0 }),
        indicatorService.get52WeekMarkers(stockCode, period),
      ]);

      setData(indicatorsResponse);
      setMarkers(markersResponse);
    } catch (err) {
      setError(err as Error);
      setData(null);
      setMarkers(null);
    } finally {
      setLoading(false);
    }
  }, [stockCode, period, subChart1Indicator, subChart2Indicator, showMA, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: data?.data || [],
    markers,
    response: data,
    loading,
    error,
    refresh: fetchData,
  };
}
