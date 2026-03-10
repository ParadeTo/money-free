import { TrendTemplateService } from './trend-template.service';
import { RsRatingService } from './rs-rating.service';
import { VcpAnalyzerService } from './vcp-analyzer.service';

const mockPrisma = {
  stock: { findMany: jest.fn() },
  kLineData: { findMany: jest.fn(), findFirst: jest.fn() },
  technicalIndicator: { findFirst: jest.fn() },
  vcpScanResult: { deleteMany: jest.fn(), create: jest.fn() },
};

jest.mock('../../modules/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { VcpScannerService } from './vcp-scanner.service';

describe('VcpScannerService', () => {
  let service: VcpScannerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VcpScannerService(
      mockPrisma as any,
      new TrendTemplateService(),
      new RsRatingService(),
      new VcpAnalyzerService(),
    );
  });

  it('scanAllStocks with mocked prisma returning 0 active stocks returns total=0', async () => {
    mockPrisma.stock.findMany.mockResolvedValue([]);
    const result = await service.scanAllStocks();
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('scanAllStocks with stock that has < 252 klines skipped (null result)', async () => {
    mockPrisma.stock.findMany.mockResolvedValue([{ stockCode: '000001', stockName: 'Test' }]);
    mockPrisma.kLineData.findFirst
      .mockResolvedValueOnce({ close: 100 })
      .mockResolvedValueOnce(null);
    const klines: any[] = [];
    for (let i = 0; i < 200; i++) {
      klines.push({
        date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000,
        amount: 100000,
      });
    }
    mockPrisma.kLineData.findMany.mockResolvedValue(klines);
    mockPrisma.vcpScanResult.deleteMany.mockResolvedValue({ count: 0 });
    const result = await service.scanAllStocks();
    expect(result.total).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('scanAllStocks with stock that has no indicators skipped (null result)', async () => {
    mockPrisma.stock.findMany.mockResolvedValue([{ stockCode: '000001', stockName: 'Test' }]);
    mockPrisma.kLineData.findFirst
      .mockResolvedValueOnce({ close: 100 })
      .mockResolvedValueOnce({ close: 90 });
    const klines: any[] = [];
    for (let i = 0; i < 300; i++) {
      klines.push({
        date: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}`),
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000,
        amount: 100000,
      });
    }
    mockPrisma.kLineData.findMany.mockResolvedValue(klines);
    mockPrisma.technicalIndicator.findFirst.mockResolvedValue(null);
    mockPrisma.vcpScanResult.deleteMany.mockResolvedValue({ count: 0 });
    const result = await service.scanAllStocks();
    expect(result.total).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
