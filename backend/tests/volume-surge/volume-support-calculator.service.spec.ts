import { Test, TestingModule } from '@nestjs/testing';
import { VolumeSupportCalculatorService } from '../../src/modules/volume-surge/services/volume-support-calculator.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';

describe('VolumeSupportCalculatorService', () => {
  let service: VolumeSupportCalculatorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolumeSupportCalculatorService,
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

    service = module.get<VolumeSupportCalculatorService>(VolumeSupportCalculatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('calculateVolumeSupport', () => {
    it('应正确计算上涨日和下降日的平均成交量', async () => {
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 1000000, close: 11, open: 10 },
        { date: new Date(2026, 2, 2), volume: 800000, close: 10.5, open: 11 },
        { date: new Date(2026, 2, 3), volume: 1200000, close: 12, open: 11 },
        { date: new Date(2026, 2, 4), volume: 600000, close: 11.5, open: 12 },
        { date: new Date(2026, 2, 5), volume: 1100000, close: 13, open: 12 },
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.calculateVolumeSupport('TEST001', new Date(2026, 2, 1));

      expect(result.upDayAvgVolume).toBeCloseTo(1100000, 0);
      expect(result.downDayAvgVolume).toBeCloseTo(700000, 0);
      expect(result.ratio).toBeCloseTo(1.57, 2);
    });

    it('应处理全是上涨日的边缘案例', async () => {
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 1000000, close: 11, open: 10 },
        { date: new Date(2026, 2, 2), volume: 1200000, close: 12, open: 11 },
        { date: new Date(2026, 2, 3), volume: 1100000, close: 13, open: 12 },
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.calculateVolumeSupport('TEST001', new Date(2026, 2, 1));

      expect(result.upDayAvgVolume).toBeGreaterThan(0);
      expect(result.downDayAvgVolume).toBe(0);
      expect(result.ratio).toBe(Infinity);
    });

    it('应处理全是下降日的边缘案例', async () => {
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 1000000, close: 10, open: 11 },
        { date: new Date(2026, 2, 2), volume: 1200000, close: 11, open: 12 },
        { date: new Date(2026, 2, 3), volume: 1100000, close: 12, open: 13 },
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.calculateVolumeSupport('TEST001', new Date(2026, 2, 1));

      expect(result.upDayAvgVolume).toBe(0);
      expect(result.downDayAvgVolume).toBeGreaterThan(0);
      expect(result.ratio).toBe(0);
    });

    it('应处理平盘日（收盘价等于开盘价）', async () => {
      const mockKLineData = [
        { date: new Date(2026, 2, 1), volume: 1000000, close: 10, open: 10 },
        { date: new Date(2026, 2, 2), volume: 1200000, close: 11, open: 10 },
      ];

      jest.spyOn(prisma.kLineData, 'findMany').mockResolvedValue(mockKLineData as any);

      const result = await service.calculateVolumeSupport('TEST001', new Date(2026, 2, 1));

      expect(result.upDayAvgVolume).toBe(1200000);
      expect(result.downDayAvgVolume).toBe(0);
    });
  });

  describe('isSupportSufficient', () => {
    it('应判断买量支撑是否充足（比率≥1.2）', () => {
      expect(service.isSupportSufficient(1000000, 800000)).toBe(true);
      expect(service.isSupportSufficient(1000000, 900000)).toBe(false);
      expect(service.isSupportSufficient(0, 1000000)).toBe(false);
    });

    it('应处理下降日成交量为0的情况', () => {
      expect(service.isSupportSufficient(1000000, 0)).toBe(true);
    });
  });
});
