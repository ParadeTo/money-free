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
      // findMany使用orderBy: desc，返回的数据是最新日期在前
      // slice(0,5)是最近5天（低成交量），slice(5,25)是前20天（高成交量）
      const mockKLineData = [
        // 最近5天：低成交量（60万，低于70万阈值），日期降序
        ...Array(5).fill(null).map((_, i) => ({
          date: new Date(2026, 1, 25 - i),
          volume: 600000,
          close: 10,
          open: 10,
        })),
        // 前20天：高成交量（平均100万），日期降序
        ...Array(20).fill(null).map((_, i) => ({
          date: new Date(2026, 1, 20 - i),
          volume: 1000000,
          close: 10,
          open: 10,
        })),
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectContractionPeriod('TEST001');

      expect(result).toBeDefined();
      expect(result!.avgVolume).toBeCloseTo(600000, 0);
      expect(result!.endDate).toEqual(new Date(2026, 1, 25));
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
      // 循环条件是 i < klineData.length - 4，需要至少5条数据循环才能执行
      // 放大点从第1天开始（index=0），后续需要至少3天维持在1.2倍(720000)以上
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 1000000, close: 11, open: 10 }, // 放大点：1.67倍，超过阈值900000
        { date: new Date(2026, 2, 2), volume: 950000, close: 11.2, open: 11 }, // 维持高位
        { date: new Date(2026, 2, 3), volume: 1100000, close: 11.5, open: 11 }, // 维持高位
        { date: new Date(2026, 2, 4), volume: 980000, close: 11.8, open: 11.5 }, // 维持高位
        { date: new Date(2026, 2, 5), volume: 900000, close: 12, open: 11.8 },   // 维持高位
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.detectExpansionPoint(
        'TEST001',
        new Date(2026, 1, 25),
        contractionAvgVolume,
      );

      expect(result).toBeDefined();
      expect(result!.date).toEqual(new Date(2026, 2, 1));
      expect(result!.multiplier).toBeGreaterThan(1.5);
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

      // detectContractionPeriod和detectExpansionPoint各自调用findMany
      // 使用mockResolvedValueOnce分别返回对应数据

      // 第一次调用：detectContractionPeriod，返回25条降序数据
      // slice(0,5)=最近5天低成交量，slice(5,25)=前20天高成交量
      const contractionData = [
        ...Array(5).fill(null).map((_, i) => ({
          date: new Date(2026, 2, 2 - i),
          volume: 600000,
          close: 10,
          open: 10,
        })),
        ...Array(20).fill(null).map((_, i) => ({
          date: new Date(2026, 1, 27 - i),
          volume: 1000000,
          close: 10,
          open: 10,
        })),
      ];

      // 第二次调用：detectExpansionPoint，返回5条升序数据（参考日期之后）
      // 需要i=0时满足：volume >= 900000(1.5x) 且 后续3天>=720000(1.2x)
      const expansionData = [
        { date: new Date(2026, 2, 3), volume: 1000000, close: 11, open: 10 },
        { date: new Date(2026, 2, 4), volume: 950000, close: 11.2, open: 11 },
        { date: new Date(2026, 2, 5), volume: 1100000, close: 11.5, open: 11 },
        { date: new Date(2026, 2, 6), volume: 980000, close: 11.8, open: 11.5 },
        { date: new Date(2026, 2, 7), volume: 900000, close: 12, open: 11.8 },
      ];

      jest
        .spyOn(prisma.kLineData, 'findMany')
        .mockResolvedValueOnce(contractionData as any)
        .mockResolvedValueOnce(expansionData as any);

      const result = await service.detectPattern('TEST001', 'MANUAL', referenceDate);

      expect(result).toBeDefined();
      expect(result!.contractionPeriod.endDate).toEqual(referenceDate);
    });
  });
});
