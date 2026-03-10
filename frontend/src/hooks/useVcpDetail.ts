import { useState, useEffect } from 'react';
import { vcpService } from '../services/vcp.service';
import type { VcpDetailResponse } from '../types/vcp';

export function useVcpDetail(stockCode: string) {
  const [data, setData] = useState<VcpDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!stockCode) {
      setData(null);
      setError(null);
      return;
    }

    const fetchVcpDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await vcpService.getVcpDetail(stockCode);
        setData(response);
      } catch (err: any) {
        // 404 错误表示该股票没有VCP数据，这是正常情况
        if (err?.response?.status === 404) {
          setData(null);
          setError(null);
        } else {
          setError(err as Error);
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVcpDetail();
  }, [stockCode]);

  return {
    data,
    loading,
    error,
    hasVcp: data !== null,
  };
}
