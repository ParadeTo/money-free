import api from './api';
import type { TechnicalIndicator } from '../types';

export interface GetIndicatorsParams {
  period?: 'daily' | 'weekly';
  indicators?: string[]; // ['ma', 'kdj', 'rsi', 'volume', 'amount', 'week52_marker']
  startDate?: string;
  endDate?: string;
}

export interface IndicatorsResponse {
  stockCode: string;
  period: 'daily' | 'weekly';
  data: TechnicalIndicator[];
  count: number;
}

export interface Week52Markers {
  stockCode: string;
  period: 'daily' | 'weekly';
  high52Week: number;
  low52Week: number;
  high52WeekDate: string;
  low52WeekDate: string;
  date: string;
}

class IndicatorService {
  /**
   * 获取技术指标
   */
  async getIndicators(
    stockCode: string,
    params: GetIndicatorsParams = {}
  ): Promise<IndicatorsResponse> {
    return await api.get(`/indicators/${stockCode}`, {
      params,
    });
  }

  /**
   * 获取52周最高/最低标注
   */
  async get52WeekMarkers(
    stockCode: string,
    period: 'daily' | 'weekly' = 'daily'
  ): Promise<Week52Markers | null> {
    try {
      return await api.get(
        `/indicators/${stockCode}/week52-markers`,
        { params: { period } }
      );
    } catch {
      return null;
    }
  }
}

export const indicatorService = new IndicatorService();
export default indicatorService;
