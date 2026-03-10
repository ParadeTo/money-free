import { vcpService } from './vcp.service';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('vcp.service', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('getVcpScanResults calls api.get with correct URL /vcp/scan when no params', async () => {
    const mockResponse = { stocks: [], totalCount: 0, scanDate: '2025-01-01' };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const result = await vcpService.getVcpScanResults({});

    expect(api.get).toHaveBeenCalledWith('/vcp/scan');
    expect(result).toEqual(mockResponse);
  });

  it('getVcpScanResults includes sortBy and sortOrder in URL when provided', async () => {
    const mockResponse = { stocks: [], totalCount: 0, scanDate: '2025-01-01' };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    await vcpService.getVcpScanResults({
      sortBy: 'lastContractionPct',
      sortOrder: 'desc',
    });

    expect(api.get).toHaveBeenCalledWith('/vcp/scan?sortBy=lastContractionPct&sortOrder=desc');
  });

  it('getVcpDetail calls api.get with /vcp/600519.SH/detail', async () => {
    const mockResponse = {
      stockCode: '600519.SH',
      stockName: '贵州茅台',
      scanDate: '2025-01-01',
      trendTemplate: { allPass: true, checks: [] },
      contractions: [],
      contractionCount: 3,
      lastContractionPct: 8.5,
      volumeDryingUp: true,
      rsRating: 92,
    };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const result = await vcpService.getVcpDetail('600519.SH');

    expect(api.get).toHaveBeenCalledWith('/vcp/600519.SH/detail');
    expect(result).toEqual(mockResponse);
  });

  it('both methods return the mocked response correctly', async () => {
    const scanResponse = { stocks: [], totalCount: 0, scanDate: '2025-01-01' };
    const detailResponse = {
      stockCode: '600519.SH',
      stockName: '贵州茅台',
      scanDate: '2025-01-01',
      trendTemplate: { allPass: true, checks: [] },
      contractions: [],
      contractionCount: 3,
      lastContractionPct: 8.5,
      volumeDryingUp: true,
      rsRating: 92,
    };
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/detail')) return Promise.resolve(detailResponse);
      return Promise.resolve(scanResponse);
    });

    const scanResult = await vcpService.getVcpScanResults({});
    const detailResult = await vcpService.getVcpDetail('600519.SH');

    expect(scanResult).toEqual(scanResponse);
    expect(detailResult).toEqual(detailResponse);
  });
});
