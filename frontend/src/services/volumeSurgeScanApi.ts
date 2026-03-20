import axios from 'axios';
import {
  ScanRequest,
  ScanSummary,
  ScanResultDetail,
  CompareRequest,
  CompareResult,
  ApiResponse,
  PaginatedResponse,
} from '../types/scan.types';

const API_BASE_URL = 'http://localhost:3000/api/volume-surge';

export const volumeSurgeScanApi = {
  async startScan(request: ScanRequest): Promise<ApiResponse<{ scanId: string; status: string; message: string }>> {
    const response = await axios.post(`${API_BASE_URL}/scan`, request);
    return response.data;
  },

  async getScanStatus(scanId: string): Promise<ApiResponse<ScanSummary>> {
    const response = await axios.get(`${API_BASE_URL}/scans/${scanId}`);
    return response.data;
  },

  async getScans(params?: {
    page?: number;
    limit?: number;
    status?: string;
    mode?: string;
  }): Promise<ApiResponse<PaginatedResponse<ScanSummary>>> {
    const response = await axios.get(`${API_BASE_URL}/scans`, { params });
    return response.data;
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
  ): Promise<ApiResponse<{
    results: ScanResultDetail[];
    pagination: any;
    summary: any;
  }>> {
    const response = await axios.get(`${API_BASE_URL}/scans/${scanId}/results`, { params });
    return response.data;
  },

  async exportResults(
    scanId: string,
    format: 'csv' | 'markdown',
    filter: 'all' | 'matched' = 'matched',
  ): Promise<string> {
    const response = await axios.get(`${API_BASE_URL}/scans/${scanId}/export`, {
      params: { format, filter },
    });
    
    if (response.data.success) {
      return response.data.data.content;
    }
    throw new Error(response.data.error?.message || 'Export failed');
  },

  async compareScans(request: CompareRequest): Promise<ApiResponse<CompareResult>> {
    const response = await axios.post(`${API_BASE_URL}/compare`, request);
    return response.data;
  },

  async cancelScan(scanId: string): Promise<ApiResponse<{ scanId: string; status: string; message: string }>> {
    const response = await axios.post(`${API_BASE_URL}/scans/${scanId}/cancel`);
    return response.data;
  },
};
