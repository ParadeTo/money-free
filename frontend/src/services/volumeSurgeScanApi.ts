import { api } from './api';
import {
  ScanRequest,
  ScanSummary,
  CompareRequest,
  CompareResult,
  ApiResponse,
  ScanListData,
  ScanResultsData,
  ExportData,
} from '../types/scan.types';

const BASE = '/api/volume-surge';

export const volumeSurgeScanApi = {
  async startScan(request: ScanRequest): Promise<ApiResponse<{ scanId: string; status: string; message: string }>> {
    return api.post<ApiResponse<{ scanId: string; status: string; message: string }>>(`${BASE}/scan`, request);
  },

  async getScanStatus(scanId: string): Promise<ApiResponse<ScanSummary>> {
    return api.get<ApiResponse<ScanSummary>>(`${BASE}/scans/${scanId}`);
  },

  async getScans(params?: {
    page?: number;
    limit?: number;
    status?: string;
    mode?: string;
  }): Promise<ApiResponse<ScanListData>> {
    return api.get<ApiResponse<ScanListData>>(`${BASE}/scans`, { params });
  },

  async getScanResults(
    scanId: string,
    params?: {
      filter?: 'all' | 'matched' | 'unmatched';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponse<ScanResultsData>> {
    return api.get<ApiResponse<ScanResultsData>>(`${BASE}/scans/${scanId}/results`, { params });
  },

  async exportResults(
    scanId: string,
    format: 'csv' | 'markdown',
    filter: 'all' | 'matched' = 'matched',
  ): Promise<string> {
    const response = await api.get<ApiResponse<ExportData>>(`${BASE}/scans/${scanId}/export`, {
      params: { format, filter },
    });

    if (response.success && response.data) {
      return response.data.content;
    }
    throw new Error(response.error?.message || 'Export failed');
  },

  async compareScans(request: CompareRequest): Promise<ApiResponse<CompareResult>> {
    return api.post<ApiResponse<CompareResult>>(`${BASE}/compare`, request);
  },

  async cancelScan(scanId: string): Promise<ApiResponse<{ scanId: string; status: string; message: string }>> {
    return api.post<ApiResponse<{ scanId: string; status: string; message: string }>>(`${BASE}/scans/${scanId}/cancel`);
  },
};
