import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VcpAnalysisPage } from './VcpAnalysisPage';
import * as vcpService from '../services/vcp.service';

/**
 * T022 [US1] - Component test for VcpAnalysisPage (basic render)
 */
describe('VcpAnalysisPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithRouter = (stockCode: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/vcp-analysis/${stockCode}`]}>
          <Routes>
            <Route path="/vcp-analysis/:stockCode" element={<VcpAnalysisPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render loading state while fetching data', () => {
    vi.spyOn(vcpService.vcpService, 'generateVcpAnalysis').mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading state
    );

    renderWithRouter('605117');

    expect(screen.getByRole('status')).toBeInTheDocument(); // Ant Design Spin has role="status"
  });

  it('should render stock name and code when data is loaded', async () => {
    const mockAnalysis = {
      stockCode: '605117',
      stockName: '德业股份',
      scanDate: '2026-03-11',
      cached: true,
      isExpired: false,
      hasVcp: true,
      summary: {
        contractionCount: 3,
        lastContractionPct: 12.40,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 2,
        latestPrice: 45.67,
        priceChangePct: 2.15,
        distFrom52WeekHigh: -5.23,
        distFrom52WeekLow: 68.45,
      },
      contractions: [],
      pullbacks: [],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    vi.spyOn(vcpService.vcpService, 'generateVcpAnalysis').mockResolvedValue(mockAnalysis);

    renderWithRouter('605117');

    await waitFor(() => {
      expect(screen.getByText('德业股份')).toBeInTheDocument();
      expect(screen.getByText(/605117/)).toBeInTheDocument();
    });
  });

  it('should display expired warning when data is expired', async () => {
    const mockAnalysis = {
      stockCode: '605117',
      stockName: '德业股份',
      scanDate: '2026-03-01',
      cached: true,
      isExpired: true, // Expired data
      hasVcp: true,
      summary: {
        contractionCount: 3,
        lastContractionPct: 12.40,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 2,
        latestPrice: 45.67,
        priceChangePct: 2.15,
        distFrom52WeekHigh: -5.23,
        distFrom52WeekLow: 68.45,
      },
      contractions: [],
      pullbacks: [],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    vi.spyOn(vcpService.vcpService, 'generateVcpAnalysis').mockResolvedValue(mockAnalysis);

    renderWithRouter('605117');

    await waitFor(() => {
      expect(screen.getByText(/已过期/i)).toBeInTheDocument();
    });
  });

  it('should display error message when stock is not found', async () => {
    vi.spyOn(vcpService.vcpService, 'generateVcpAnalysis').mockRejectedValue(
      new Error('未找到股票代码 999999')
    );

    renderWithRouter('999999');

    await waitFor(() => {
      expect(screen.getByText(/未找到股票代码/i)).toBeInTheDocument();
    });
  });

  it('should display VCP status (有效/无效)', async () => {
    const mockAnalysis = {
      stockCode: '605117',
      stockName: '德业股份',
      scanDate: '2026-03-11',
      cached: true,
      isExpired: false,
      hasVcp: true,
      summary: {
        contractionCount: 3,
        lastContractionPct: 12.40,
        volumeDryingUp: true,
        rsRating: 85,
        inPullback: false,
        pullbackCount: 2,
        latestPrice: 45.67,
        priceChangePct: 2.15,
        distFrom52WeekHigh: -5.23,
        distFrom52WeekLow: 68.45,
      },
      contractions: [],
      pullbacks: [],
      klines: [],
      trendTemplate: { pass: true, checks: [] },
    };

    vi.spyOn(vcpService.vcpService, 'generateVcpAnalysis').mockResolvedValue(mockAnalysis);

    renderWithRouter('605117');

    await waitFor(() => {
      expect(screen.getByText(/VCP形态/i)).toBeInTheDocument();
    });
  });
});
