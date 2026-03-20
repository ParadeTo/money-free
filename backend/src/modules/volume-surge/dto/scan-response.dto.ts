import {
  ScanMode,
  ScanStatus,
  ScanSummary,
  ScanResultDetail,
  CompareResult,
  PersistentStock,
} from '../../../types/scan.types';

export class ScanResponseDto {
  success!: boolean;
  data?: {
    scanId: string;
    status: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ScanStatusResponseDto {
  success!: boolean;
  data?: ScanSummary;
  error?: {
    code: string;
    message: string;
  };
}

export class ScanListResponseDto {
  success!: boolean;
  data?: {
    scans: ScanSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export class ScanResultsResponseDto {
  success!: boolean;
  data?: {
    results: ScanResultDetail[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalStocks: number;
      matchedStocks: number;
      unmatchedStocks: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export class CompareScanResponseDto {
  success!: boolean;
  data?: CompareResult;
  error?: {
    code: string;
    message: string;
  };
}

export class CancelScanResponseDto {
  success!: boolean;
  data?: {
    scanId: string;
    status: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
