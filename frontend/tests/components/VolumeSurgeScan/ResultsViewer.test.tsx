import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResultsViewer from '../../../src/pages/VolumeSurgeScan/components/ResultsViewer';
import { volumeSurgeScanApi } from '../../../src/services/volumeSurgeScanApi';
import { ScanSummary } from '../../../src/types/scan.types';

vi.mock('../../../src/services/volumeSurgeScanApi', () => ({
  volumeSurgeScanApi: {
    getScanResults: vi.fn(),
    exportResults: vi.fn(),
  },
}));

const mockScan: ScanSummary = {
  scanId: 'scan-1',
  scanDate: '2026-04-01T10:00:00Z',
  scanMode: 'AUTO' as const,
  status: 'COMPLETED' as const,
  totalStocks: 100,
  matchedStocks: 5,
  unmatchedStocks: 95,
  durationMs: 5000,
};

const mockResults = [
  {
    resultId: 'r1',
    scanId: 'scan-1',
    stockCode: '600519',
    stockName: 'Kweichow Moutai',
    volumePattern: {
      contractionPeriod: { startDate: '2026-03-01', endDate: '2026-03-20', avgVolume: 10000 },
      expansionPoint: { date: '2026-03-25', volume: 30000, multiplier: 3.0, days: 2 },
    },
    volumeSupport: { upDayAvgVolume: 25000, downDayAvgVolume: 12000, ratio: 2.08 },
    movingAverages: { ma50: 1800, ma150: 1750, ma50Slope: 0.0012, isTrendingUp: true, ma50BelowMa150: false },
    criteria: { meetsVolumeCriteria: true, meetsMaCriteria: true, meetsSupportCriteria: true, meetsAllCriteria: true },
    createdAt: '2026-04-01T10:05:00Z',
  },
  {
    resultId: 'r2',
    scanId: 'scan-1',
    stockCode: '000858',
    stockName: 'Wuliangye Yibin',
    volumePattern: {
      contractionPeriod: { startDate: '2026-03-05', endDate: '2026-03-22', avgVolume: 8000 },
      expansionPoint: { date: '2026-03-26', volume: 20000, multiplier: 2.5, days: 1 },
    },
    volumeSupport: { upDayAvgVolume: 18000, downDayAvgVolume: 15000, ratio: 1.2 },
    movingAverages: { ma50: 160, ma150: 155, ma50Slope: -0.001, isTrendingUp: false, ma50BelowMa150: false },
    criteria: { meetsVolumeCriteria: true, meetsMaCriteria: false, meetsSupportCriteria: true, meetsAllCriteria: false },
    createdAt: '2026-04-01T10:05:00Z',
  },
];

describe('ResultsViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderResults = (scan: ScanSummary = mockScan) => {
    return render(
      <BrowserRouter>
        <ResultsViewer scan={scan} />
      </BrowserRouter>
    );
  };

  describe('with results', () => {
    beforeEach(() => {
      vi.mocked(volumeSurgeScanApi.getScanResults).mockResolvedValue({
        success: true,
        data: {
          results: mockResults,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          summary: { totalScanned: 100, matched: 2, unmatched: 98 },
        },
      });
    });

    it('renders stock name column', async () => {
      renderResults();

      await waitFor(() => {
        expect(screen.getByText('Kweichow Moutai')).toBeInTheDocument();
        expect(screen.getByText('Wuliangye Yibin')).toBeInTheDocument();
      });
    });

    it('renders stock code as a link to chart page', async () => {
      renderResults();

      await waitFor(() => {
        const link600519 = screen.getByRole('link', { name: '600519' });
        expect(link600519).toBeInTheDocument();
        expect(link600519).toHaveAttribute('href', '/chart/600519');

        const link000858 = screen.getByRole('link', { name: '000858' });
        expect(link000858).toBeInTheDocument();
        expect(link000858).toHaveAttribute('href', '/chart/000858');
      });
    });

    it('renders scan summary statistics', async () => {
      renderResults();

      await waitFor(() => {
        expect(screen.getByText('Total Stocks')).toBeInTheDocument();
        expect(screen.getByText('Matched Stocks')).toBeInTheDocument();
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });

    it('renders criteria status tags', async () => {
      renderResults();

      await waitFor(() => {
        expect(screen.getByText('All Criteria Met')).toBeInTheDocument();
        expect(screen.getByText('Partial Match')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('renders empty state when results array is empty', async () => {
      vi.mocked(volumeSurgeScanApi.getScanResults).mockResolvedValue({
        success: true,
        data: {
          results: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          summary: { totalScanned: 100, matched: 0, unmatched: 100 },
        },
      });

      renderResults();

      await waitFor(() => {
        expect(screen.getByText('No results found for this scan')).toBeInTheDocument();
      });
    });
  });

  describe('column headers', () => {
    it('renders all expected column headers', async () => {
      vi.mocked(volumeSurgeScanApi.getScanResults).mockResolvedValue({
        success: true,
        data: {
          results: mockResults,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          summary: { totalScanned: 100, matched: 2, unmatched: 98 },
        },
      });

      renderResults();

      await waitFor(() => {
        expect(screen.getByText('Stock Code')).toBeInTheDocument();
        expect(screen.getByText('Stock Name')).toBeInTheDocument();
        expect(screen.getByText('Expansion Multiplier')).toBeInTheDocument();
        expect(screen.getByText('Volume Support Ratio')).toBeInTheDocument();
        expect(screen.getByText('MA50 Slope')).toBeInTheDocument();
      });
    });
  });
});
