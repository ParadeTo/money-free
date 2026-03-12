import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KLineChartPage } from '../../src/pages/KLineChartPage';
import { VcpAnalysisPage } from '../../src/pages/VcpAnalysisPage';
import * as vcpService from '../../src/services/vcp.service';

/**
 * T023 [US1] - Integration test for complete flow
 * 
 * Tests the complete user journey:
 * 1. User is on K-line chart page
 * 2. User clicks "生成VCP分析报告" button
 * 3. System shows generating status
 * 4. System opens new page with VCP analysis report
 */
describe('VCP Analysis Flow (integration) - T023 [US1]', () => {
  let queryClient: QueryClient;
  let windowOpenSpy: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    
    // Mock window.open
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('should complete the full VCP analysis generation flow', async () => {
    // Mock VCP analysis data
    const mockAnalysis = {
      stockCode: '605117',
      stockName: '德业股份',
      scanDate: '2026-03-11',
      cached: false,
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

    // Mock K-line data (needed for KLineChartPage)
    vi.mock('../../src/hooks/useKLineData', () => ({
      useKLineData: () => ({
        data: [],
        loading: false,
        error: null,
      }),
    }));

    vi.mock('../../src/hooks/useIndicators', () => ({
      useIndicators: () => ({
        data: null,
        markers: [],
        loading: false,
        error: null,
      }),
    }));

    vi.mock('../../src/hooks/useVcpDetail', () => ({
      useVcpDetail: () => ({
        data: null,
        loading: false,
        error: null,
      }),
    }));

    // Render K-line chart page
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/chart/605117']}>
          <Routes>
            <Route path="/chart/:stockCode" element={<KLineChartPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /生成VCP分析报告/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click the generate button
    const generateButton = screen.getByRole('button', { name: /生成VCP分析报告/i });
    fireEvent.click(generateButton);

    // Verify window.open was called with correct URL
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('/vcp-analysis/605117'),
        '_blank'
      );
    });
  });

  it('should show generating status during VCP analysis', async () => {
    // Mock a slow VCP analysis
    vi.spyOn(vcpService.vcpService, 'generateVcpAnalysis').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        stockCode: '605117',
        stockName: '德业股份',
        scanDate: '2026-03-11',
        cached: false,
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
      }), 1000))
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/chart/605117']}>
          <Routes>
            <Route path="/chart/:stockCode" element={<KLineChartPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click generate button
    const generateButton = await screen.findByRole('button', { name: /生成VCP分析报告/i });
    fireEvent.click(generateButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/生成中/i)).toBeInTheDocument();
    });
  });
});
