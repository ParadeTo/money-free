import { render, screen, waitFor } from '@testing-library/react';
import { VcpDetailPanel } from './index';
import { vcpService } from '../../services/vcp.service';

vi.mock('../../services/vcp.service', () => ({
  vcpService: {
    getVcpDetail: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const mockDetailResponse = {
  stockCode: '600519.SH',
  stockName: '贵州茅台',
  scanDate: '2025-01-01',
  trendTemplate: {
    allPass: true,
    checks: [
      { name: 'priceAboveMA150', label: '股价 > MA150', pass: true, currentValue: 100, threshold: 85 },
    ],
  },
  contractions: [
    {
      index: 1,
      swingHighDate: '2025-01-01',
      swingHighPrice: 1800,
      swingLowDate: '2025-01-15',
      swingLowPrice: 1650,
      depthPct: 8.3,
      durationDays: 14,
      avgVolume: 1000000,
    },
  ],
  contractionCount: 3,
  lastContractionPct: 8.5,
  volumeDryingUp: true,
  rsRating: 92,
};

describe('VcpDetailPanel', () => {
  beforeEach(() => {
    vi.mocked(vcpService.getVcpDetail).mockReset();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(vcpService.getVcpDetail).mockImplementation(
      () => new Promise(() => {})
    );
    render(<VcpDetailPanel stockCode="600519.SH" />);
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('after data loads, renders TrendTemplateChecks section with Trend Template text', async () => {
    vi.mocked(vcpService.getVcpDetail).mockResolvedValue(mockDetailResponse);
    render(<VcpDetailPanel stockCode="600519.SH" />);

    await waitFor(() => {
      expect(screen.getByText('Trend Template')).toBeInTheDocument();
    });
  });

  it('renders contraction table with 收缩记录 heading', async () => {
    vi.mocked(vcpService.getVcpDetail).mockResolvedValue(mockDetailResponse);
    render(<VcpDetailPanel stockCode="600519.SH" />);

    await waitFor(() => {
      expect(screen.getByText('收缩记录')).toBeInTheDocument();
    });
  });

  it('shows 查看K线 button', async () => {
    vi.mocked(vcpService.getVcpDetail).mockResolvedValue(mockDetailResponse);
    render(<VcpDetailPanel stockCode="600519.SH" />);

    await waitFor(() => {
      expect(screen.getByText('查看K线')).toBeInTheDocument();
    });
  });

  it('shows error Alert on API failure', async () => {
    vi.mocked(vcpService.getVcpDetail).mockRejectedValue(
      new Error('Network error')
    );
    render(<VcpDetailPanel stockCode="600519.SH" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
