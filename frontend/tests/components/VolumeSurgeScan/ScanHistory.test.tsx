import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import ScanHistory from '../../../src/pages/VolumeSurgeScan/components/ScanHistory';
import { volumeSurgeScanApi } from '../../../src/services/volumeSurgeScanApi';

vi.mock('../../../src/services/volumeSurgeScanApi', () => ({
  volumeSurgeScanApi: {
    getScans: vi.fn(),
  },
}));

const mockScans = [
  {
    scanId: 'scan-1',
    scanDate: '2026-04-01T10:00:00Z',
    scanMode: 'AUTO',
    status: 'COMPLETED',
    totalStocks: 100,
    matchedStocks: 5,
    unmatchedStocks: 95,
    durationMs: 5000,
  },
  {
    scanId: 'scan-2',
    scanDate: '2026-03-31T14:00:00Z',
    scanMode: 'MANUAL',
    status: 'FAILED',
    totalStocks: 50,
    matchedStocks: 0,
    unmatchedStocks: 0,
    durationMs: 2000,
  },
];

describe('ScanHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHistory = (props = {}) => {
    return render(
      <BrowserRouter>
        <ScanHistory {...props} />
      </BrowserRouter>
    );
  };

  describe('with scan data', () => {
    it('renders scan list using scans field from API response', async () => {
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: mockScans,
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      });

      renderHistory();

      const expectedDate1 = dayjs('2026-04-01T10:00:00Z').format('YYYY-MM-DD HH:mm');
      const expectedDate2 = dayjs('2026-03-31T14:00:00Z').format('YYYY-MM-DD HH:mm');

      await waitFor(() => {
        expect(screen.getByText(expectedDate1)).toBeInTheDocument();
        expect(screen.getByText(expectedDate2)).toBeInTheDocument();
      });
    });

    it('renders status tags for each scan', async () => {
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: mockScans,
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      });

      renderHistory();

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('renders matched stock counts', async () => {
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: mockScans,
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      });

      renderHistory();

      await waitFor(() => {
        expect(screen.getByText('5 / 100')).toBeInTheDocument();
        expect(screen.getByText('0 / 50')).toBeInTheDocument();
      });
    });

    it('calls onScanSelect when "View Results" is clicked', async () => {
      const onScanSelect = vi.fn();
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: mockScans,
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      });

      const user = userEvent.setup();
      renderHistory({ onScanSelect });

      await waitFor(() => {
        expect(screen.getAllByText('View Results')).toHaveLength(2);
      });

      const viewButtons = screen.getAllByText('View Results');
      await user.click(viewButtons[0]);

      expect(onScanSelect).toHaveBeenCalledWith('scan-1');
    });
  });

  describe('empty state', () => {
    it('renders empty message when no scans exist', async () => {
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      });

      renderHistory();

      await waitFor(() => {
        expect(screen.getByText(/No scans found/i)).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('shows total scan count', async () => {
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: mockScans,
          pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
        },
      });

      renderHistory();

      await waitFor(() => {
        expect(screen.getByText('Total 25 scans')).toBeInTheDocument();
      });
    });
  });

  describe('refresh', () => {
    it('re-fetches when refreshTrigger changes', async () => {
      vi.mocked(volumeSurgeScanApi.getScans).mockResolvedValue({
        success: true,
        data: {
          scans: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
      });

      const { rerender } = render(
        <BrowserRouter>
          <ScanHistory refreshTrigger={0} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(volumeSurgeScanApi.getScans).toHaveBeenCalledTimes(1);
      });

      rerender(
        <BrowserRouter>
          <ScanHistory refreshTrigger={1} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(volumeSurgeScanApi.getScans).toHaveBeenCalledTimes(2);
      });
    });
  });
});
