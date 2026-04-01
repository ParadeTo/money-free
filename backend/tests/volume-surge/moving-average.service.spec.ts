import { Test, TestingModule } from '@nestjs/testing';
import { MovingAverageService } from '../../src/modules/volume-surge/services/moving-average.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('MovingAverageService', () => {
  let service: MovingAverageService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovingAverageService,
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

    service = module.get<MovingAverageService>(MovingAverageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('calculateMovingAverage', () => {
    it('应正确计算50日简单移动平均', async () => {
      const mockPrices = Array(50).fill(null).map((_, i) => ({
        date: new Date(2026, 2, i + 1),
        close: 10 + i * 0.1,
        volume: 1000000,
        open: 10,
      }));

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockPrices as any);

      const result = await service.calculateMovingAverage('TEST001', 50);

      const expectedAvg = mockPrices.reduce((sum, p) => sum + p.close, 0) / 50;
      expect(result).toBeCloseTo(expectedAvg, 2);
    });

    it('应返回null如果数据不足50天', async () => {
      const mockPrices = Array(40).fill(null).map((_, i) => ({
        date: new Date(2026, 2, i + 1),
        close: 10,
        volume: 1000000,
        open: 10,
      }));

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockPrices as any);

      const result = await service.calculateMovingAverage('TEST001', 50);

      expect(result).toBeNull();
    });
  });

  describe('calculateMA50Slope', () => {
    it('应计算最近5个交易日50日均线的线性回归斜率', async () => {
      // Simulate orderBy: desc — index 0 is the most recent date with the highest close
      const mockKLineData = Array(150).fill(null).map((_, i) => ({
        date: new Date(2026, 0, 150 - i),
        close: 10 + (149 - i) * 0.02,
        volume: 1000000,
        open: 10,
      }));

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.calculateMA50Slope('TEST001');

      expect(result).toBeGreaterThan(0);
    });

    it('应识别下降趋势（负斜率）', async () => {
      // Simulate orderBy: desc — index 0 is the most recent date with the lowest close
      const mockKLineData = Array(150).fill(null).map((_, i) => ({
        date: new Date(2026, 0, 150 - i),
        close: 15 - (149 - i) * 0.02,
        volume: 1000000,
        open: 15,
      }));

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.calculateMA50Slope('TEST001');

      expect(result).toBeLessThan(0);
    });
  });

  describe('getMovingAverageTrend', () => {
    it('应返回完整的均线趋势对象', async () => {
      // Simulate orderBy: desc — index 0 is the most recent date with the highest close
      // Recent prices are rising, so ma50 > ma150 and slope > 0
      const mockKLineData = Array(150).fill(null).map((_, i) => ({
        date: new Date(2026, 0, 150 - i),
        close: 10 + (149 - i) * 0.01,
        volume: 1000000,
        open: 10,
      }));

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.getMovingAverageTrend('TEST001');

      expect(result).toBeDefined();
      expect(result!.ma50).toBeGreaterThan(0);
      expect(result!.ma150).toBeGreaterThan(0);
      expect(result!.ma50Slope).toBeGreaterThan(0);
      expect(result!.isTrendingUp).toBe(true);
      expect(result!.ma50BelowMa150).toBe(false);
    });

    it('应正确判断50日均线是否低于150日均线', async () => {
      // Simulate orderBy: desc — index 0 is the most recent date
      // Recent 50 days (i=0..49) have close=12, older 100 days (i=50..149) have close=10
      // So ma50 (12) > ma150 (~10.67), meaning ma50BelowMa150 is false
      const mockKLineData = Array(150).fill(null).map((_, i) => {
        if (i < 50) return { date: new Date(2026, 0, 150 - i), close: 12, volume: 1000000, open: 10 };
        return { date: new Date(2026, 0, 150 - i), close: 10, volume: 1000000, open: 10 };
      });

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.getMovingAverageTrend('TEST001');

      expect(result!.ma50).toBeGreaterThan(result!.ma150);
      expect(result!.ma50BelowMa150).toBe(false);
    });
  });
});
