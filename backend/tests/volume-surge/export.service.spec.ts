import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from '../../src/modules/volume-surge/services/export.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: PrismaService,
          useValue: {
            volumeSurgeScan: { findUnique: jest.fn() },
            scanResult: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('exportToCSV', () => {
    it('应生成包含所有字段的CSV文件', async () => {
      const mockScan = {
        id: 'scan-123',
        scanDate: new Date('2026-03-18'),
        status: 'COMPLETED',
      };

      const mockResults = [
        {
          stockCode: 'SH600111',
          stock: { stockName: '北方稀土' },
          contractionStartDate: new Date('2026-02-20'),
          contractionEndDate: new Date('2026-03-01'),
          expansionStartDate: new Date('2026-03-02'),
          expansionMultiplier: 2.5,
          upDayAvgVolume: 400000000,
          downDayAvgVolume: 200000000,
          volumeSupportRatio: 2.0,
          ma50Value: 12.5,
          ma150Value: 13.2,
          ma50Slope: 0.05,
          meetsAllCriteria: true,
        },
      ];

      jest.spyOn(prisma.volumeSurgeScan, 'findUnique').mockResolvedValue(mockScan as any);
      jest.spyOn(prisma.scanResult, 'findMany').mockResolvedValue(mockResults as any);

      const csv = await service.exportToCSV('scan-123', 'matched');

      expect(csv).toContain('Stock Code,Stock Name');
      expect(csv).toContain('SH600111,北方稀土');
      expect(csv).toContain('2.5');
      expect(csv).toContain('2.0');
    });
  });

  describe('exportToMarkdown', () => {
    it('应生成类似VCP日报格式的Markdown文件', async () => {
      const mockScan = {
        id: 'scan-123',
        scanDate: new Date('2026-03-18'),
        totalStocks: 3000,
        matchedStocks: 42,
        durationMs: 8500,
        scanMode: 'full',
        referenceDate: null,
      };

      const mockResults = [
        {
          stockCode: 'SH600111',
          stock: { stockName: '北方稀土' },
          contractionStartDate: new Date('2026-02-20'),
          contractionEndDate: new Date('2026-03-01'),
          expansionStartDate: new Date('2026-03-02'),
          expansionMultiplier: 2.5,
          contractionAvgVolume: 300000000,
          upDayAvgVolume: 400000000,
          downDayAvgVolume: 200000000,
          volumeSupportRatio: 2.0,
          ma50Value: 12.5,
          ma150Value: 13.2,
          ma50TrendingUp: true,
          ma50BelowMa150: false,
          meetsAllCriteria: true,
        },
      ];

      jest.spyOn(prisma.volumeSurgeScan, 'findUnique').mockResolvedValue(mockScan as any);
      jest.spyOn(prisma.scanResult, 'findMany').mockResolvedValue(mockResults as any);

      const markdown = await service.exportToMarkdown('scan-123', 'matched');

      expect(markdown).toContain('# Volume Surge Scan Results');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('Total Stocks Scanned');
      expect(markdown).toContain('SH600111');
      expect(markdown).toContain('北方稀土');
    });
  });
});
