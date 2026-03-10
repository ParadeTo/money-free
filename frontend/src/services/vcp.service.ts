import { api } from './api';
import type { VcpScanResponse, VcpScanQuery, VcpDetailResponse } from '../types/vcp';

export const vcpService = {
  async getVcpScanResults(query: VcpScanQuery = {}): Promise<VcpScanResponse> {
    const params = new URLSearchParams();
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);
    if (query.inPullbackOnly !== undefined) params.set('inPullbackOnly', String(query.inPullbackOnly));
    const qs = params.toString();
    return api.get<VcpScanResponse>(`/vcp/scan${qs ? `?${qs}` : ''}`);
  },

  async getVcpDetail(stockCode: string): Promise<VcpDetailResponse> {
    return api.get<VcpDetailResponse>(`/vcp/${stockCode}/detail`);
  },
};
