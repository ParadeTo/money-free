import { Test, TestingModule } from '@nestjs/testing';
import { PatternDetectorService } from '../../src/modules/volume-surge/services/pattern-detector.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('PatternDetectorService', () => {
  let service: PatternDetectorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatternDetectorService,
        {
          provide: PrismaService,
          useValue: {
            kLineData: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PatternDetectorService>(PatternDetectorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('detectContractionPeriod', () => {
    it('应识别连续5天成交量低于前20天均值70%的萎缩期', async () => {
      const mockKLineData = [
        // 前20天：高成交量（平均100万）
        ...Array(20).fill(null).map((_, i) => ({
          date: new Date(2026, 1, i + 1),
          volume: 1000000,
          close: 10,
          open: 10,
        })),
        // 后5天：低成交量（60万，低于70万阈值）
        ...Array(5).fill(null).map((_, i) => ({
          date: new Date(2026, 1, 21 + i),
          volume: 600000,
          close: 10,
          open: 10,
        })),
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectContractionPeriod('TEST001');

      expect(result).toBeDefined();
      expect(result.avgVolume).toBeCloseTo(600000, 0);
      expect(result.endDate).toEqual(new Date(2026, 1, 25));
    });

    it('应返回null如果没有检测到萎缩期', async () => {
      const mockKLineData = Array(30).fill(null).map((_, i) => ({
        date: new Date(2026, 1, i + 1),
        volume: 1000000,
        close: 10,
        open: 10,
      }));

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectContractionPeriod('TEST001');

      expect(result).toBeNull();
    });
  });

  describe('detectExpansionPoint', () => {
    it('应识别成交量超过萎缩期均值150%的放大点', async () => {
      const contractionAvgVolume = 600000;
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 500000, close: 10, open: 10 },
        { date: new Date(2026, 2, 2), volume: 1000000, close: 11, open: 10 }, // 放大点：1.67倍
        { date: new Date(2026, 2, 3), volume: 1100000, close: 11.5, open: 11 },
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectExpansionPoint(
        'TEST001',
        new Date(2026, 1, 25),
        contractionAvgVolume,
      );

      expect(result).toBeDefined();
      expect(result.date).toEqual(new Date(2026, 2, 2));
      expect(result.multiplier).toBeCloseTo(1.67, 1);
    });

    it('应返回null如果成交量放大不足150%', async () => {
      const contractionAvgVolume = 600000;
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 700000, close: 10, open: 10 }, // 仅1.17倍
        { date: new Date(2026, 2, 2), volume: 800000, close: 10.5, open: 10 },
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectExpansionPoint(
        'TEST001',
        new Date(2026, 1, 25),
        contractionAvgVolume,
      );

      expect(result).toBeNull();
    });
  });

  describe('detectPattern (manual mode)', () => {
    it('应在手动模式下使用指定的参考日期', async () => {
      const referenceDate = new Date(2026, 2, 2);
      
      const mockKLineData = [
        // 参考日期前：萎缩
        ...Array(5).fill(null).map((_, i) => ({
          date: new Date(2026, 1, 26 + i),
          volume: 600000,
          close: 10,
          open: 10,
        })),
        // 参考日期后：放大
        ...Array(5).fill(null).map((_, i) => ({
          date: new Date(2026, 2, 3 + i),
          volume: 1000000,
          close: 11,
          open: 10,
        })),
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectPattern('TEST001', 'MANUAL', referenceDate);

      expect(result).toBeDefined();
      expect(result.contractionPeriod.endDate).toEqual(referenceDate);
    });
  });
});
