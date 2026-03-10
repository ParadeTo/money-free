import { useState, useEffect, useCallback } from 'react';
import { klineService, type GetKLineParams, type KLineResponse } from '../services/kline.service';
import type { TimeRange } from '../store/chart.store';
import { getDateRangeFromTimeRange } from '../utils/dateRange';

export function useKLineData(
  stockCode: string, 
  period: 'daily' | 'weekly' = 'daily',
  timeRange: TimeRange = '1Y'
) {
  const [data, setData] = useState<KLineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (params?: GetKLineParams) => {
    if (!stockCode) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 根据时间范围计算起始日期，不传递 endDate 以获取最新数据
      const { startDate } = getDateRangeFromTimeRange(timeRange);
      
      const response = await klineService.getKLineData(stockCode, {
        period,
        startDate,
        // 不传递 endDate，让后端返回到最新日期的数据
        limit: 2000, // 设置足够大的 limit
        ...params,
      });
      setData(response);
    } catch (err) {
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [stockCode, period, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: data?.data || [],
    response: data,
    loading,
    error,
    refresh: fetchData,
  };
}
