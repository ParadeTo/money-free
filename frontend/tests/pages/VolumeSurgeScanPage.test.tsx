import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import VolumeSurgeScanPage from '../../src/pages/VolumeSurgeScan/index';
import { volumeSurgeScanApi } from '../../src/services/volumeSurgeScanApi';

vi.mock('../../src/services/volumeSurgeScanApi', () => ({
  volumeSurgeScanApi: {
    startScan: vi.fn(),
    getScanStatus: vi.fn(),
    getScans: vi.fn(),
    getScanResults: vi.fn(),
    exportResults: vi.fn(),
    compareScans: vi.fn(),
    cancelScan: vi.fn(),
  },
}));

describe('VolumeSurgeScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
      success: true,
      data: { scans: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
    });
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <VolumeSurgeScanPage />
      </BrowserRouter>
    );
  };

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Volume Surge Scanner')).toBeInTheDocument();
  });

  it('renders all tab items', () => {
    renderPage();
    expect(screen.getByText('New Scan')).toBeInTheDocument();
    expect(screen.getByText('Scan History')).toBeInTheDocument();
    expect(screen.getByText('Compare Scans')).toBeInTheDocument();
  });

  describe('scan trigger disabled state', () => {
    it('shows warning alert when a scan is running', async () => {
      vi.mocked(volumeSurgeScanApi.startScan).mockResolvedValue({
        success: true,
        data: { scanId: 'scan-1', status: 'RUNNING', message: 'Started' },
      });
      vi.mocked(volumeSurgeScanApi.getScanStatus).mockResolvedValue({
        success: true,
        data: {
          scanId: 'scan-1',
          scanDate: '2026-04-01',
          scanMode: 'AUTO' as const,
          status: 'RUNNING' as const,
          totalStocks: 0,
          matchedStocks: 0,
          unmatchedStocks: 0,
        },
      });

      const user = userEvent.setup();
      renderPage();

      const submitButton = screen.getByRole('button', { name: /Start Scan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(volumeSurgeScanApi.getScanStatus).toHaveBeenCalledWith('scan-1');
      });

      await waitFor(() => {
        expect(screen.getByText(/A scan is already in progress/i)).toBeInTheDocument();
      });
    });

    it('re-enables scan trigger when scan completes', async () => {
      vi.mocked(volumeSurgeScanApi.startScan).mockResolvedValue({
        success: true,
        data: { scanId: 'scan-1', status: 'RUNNING', message: 'Started' },
      });

      let callCount = 0;
      vi.mocked(volumeSurgeScanApi.getScanStatus).mockImplementation(async () => {
        callCount++;
        if (callCount <= 1) {
          return {
            success: true,
            data: {
              scanId: 'scan-1',
              scanDate: '2026-04-01',
              scanMode: 'AUTO' as const,
              status: 'RUNNING' as const,
              totalStocks: 100,
              matchedStocks: 0,
              unmatchedStocks: 0,
            },
          };
        }
        return {
          success: true,
          data: {
            scanId: 'scan-1',
            scanDate: '2026-04-01',
            scanMode: 'AUTO' as const,
            status: 'COMPLETED' as const,
            totalStocks: 100,
            matchedStocks: 5,
            unmatchedStocks: 95,
            durationMs: 5000,
          },
        };
      });

      const user = userEvent.setup();
      renderPage();

      const submitButton = screen.getByRole('button', { name: /Start Scan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/A scan is already in progress/i)).toBeInTheDocument();
      });

      await waitFor(
        () => {
          expect(screen.queryByText(/A scan is already in progress/i)).not.toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });
  });
});
