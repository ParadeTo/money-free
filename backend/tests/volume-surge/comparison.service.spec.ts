import { Test, TestingModule } from '@nestjs/testing';
import { ComparisonService } from '../../src/modules/volume-surge/services/comparison.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('ComparisonService', () => {
  let service: ComparisonService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonService,
        {
          provide: PrismaService,
          useValue: {
            volumeSurgeScan: { findUnique: jest.fn() },
            scanResult: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(10) },
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComparisonService>(ComparisonService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('compareScans', () => {
    it('应识别在两次扫描中都符合条件的持续股票', async () => {
      const mockScan1 = {
        id: 'scan-1',
        scanDate: new Date('2026-03-18'),
        matchedStocks: 42,
      };
      const mockScan2 = {
        id: 'scan-2',
        scanDate: new Date('2026-03-15'),
        matchedStocks: 38,
      };

      jest
        .spyOn(prisma.volumeSurgeScan, 'findUnique')
        .mockResolvedValueOnce(mockScan1 as any)
        .mockResolvedValueOnce(mockScan2 as any);

      const mockPersistentStocks = [
        {
          stock_code: 'SH600111',
          name: '北方稀土',
          ratio_scan1: 2.0,
          ratio_scan2: 1.8,
        },
      ];

      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(mockPersistentStocks);

      const result = await service.compareScans('scan-1', 'scan-2');

      expect(result.persistentStocks).toHaveLength(1);
      expect(result.persistentStocks[0].stockCode).toBe('SH600111');
      expect(result.persistentStocks[0].trend).toBe('declining');
    });

    it('应正确计算趋势（improving/declining/stable）', () => {
      expect(service.calculateTrend(2.0, 2.5)).toBe('improving');
      expect(service.calculateTrend(2.5, 2.0)).toBe('declining');
      expect(service.calculateTrend(2.0, 2.05)).toBe('stable');
    });
  });
});
