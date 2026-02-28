import api from './api';
import type { KLineData } from '../types';

export interface GetKLineParams {
  period?: 'daily' | 'weekly';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  limit?: number;
}

export interface KLineResponse {
  stockCode: string;
  period: 'daily' | 'weekly';
  data: KLineData[];
  count: number;
}

class KLineService {
  /**
   * 获取K线数据
   */
  async getKLineData(
    stockCode: string,
    params: GetKLineParams = {}
  ): Promise<KLineResponse> {
    return await api.get(`/klines/${stockCode}`, {
      params,
    });
  }
}

export const klineService = new KLineService();
export default klineService;
