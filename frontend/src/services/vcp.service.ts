import { api } from './api';
import type { 
  VcpScanResponse, 
  VcpScanQuery, 
  VcpDetailResponse,
  FilterConditions,
  FilterEarlyStageResponse,
  VcpAnalysis,
} from '../types/vcp';

export const vcpService = {
  async getVcpScanResults(query: VcpScanQuery = {}): Promise<VcpScanResponse> {
    const params = new URLSearchParams();
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);
    if (query.inPullbackOnly !== undefined) params.set('inPullbackOnly', String(query.inPullbackOnly));
    if (query.maxPullbackPct !== undefined) params.set('maxPullbackPct', String(query.maxPullbackPct));
    const qs = params.toString();
    return api.get<VcpScanResponse>(`/vcp/scan${qs ? `?${qs}` : ''}`);
  },

  async getVcpDetail(stockCode: string): Promise<VcpDetailResponse> {
    return api.get<VcpDetailResponse>(`/vcp/${stockCode}/detail`);
  },

  async filterEarlyStage(conditions: FilterConditions): Promise<FilterEarlyStageResponse> {
    return api.post<FilterEarlyStageResponse>('/vcp/early-stage', conditions);
  },

  /**
   * Generate VCP analysis for a single stock
   * @param stockCode Stock code (e.g., "605117")
   * @param forceRefresh Force real-time analysis (ignore cache)
   * @returns VCP analysis result
   */
  async generateVcpAnalysis(stockCode: string, forceRefresh = false): Promise<VcpAnalysis> {
    const params = new URLSearchParams();
    if (forceRefresh) {
      params.set('forceRefresh', 'true');
    }
    const qs = params.toString();
    return api.get<VcpAnalysis>(`/vcp/${stockCode}/analysis${qs ? `?${qs}` : ''}`);
  },
};
