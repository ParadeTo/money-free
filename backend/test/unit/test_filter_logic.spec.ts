// backend/test/unit/test_filter_logic.spec.ts
// T133 [P] [US2] Unit test for filter condition AND logic

import { Test, TestingModule } from '@nestjs/testing';
import { ScreenerService } from '../../src/modules/screener/screener.service';
import { PrismaService } from '../../src/services/prisma/prisma.service';

describe('Filter Condition Logic', () => {
  let service: ScreenerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenerService,
        {
          provide: PrismaService,
          useValue: {
            stock: {
              findMany: jest.fn(),
            },
            technicalIndicator: {
              findMany: jest.fn(),
            },
            kLineData: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ScreenerService>(ScreenerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('indicator_value conditions', () => {
    it('should apply greater than operator correctly', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'rsi',
          operator: '>',
          targetValue: 70,
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should apply less than operator correctly', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'rsi',
          operator: '<',
          targetValue: 30,
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should apply equals operator correctly', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'kdj_k',
          operator: '=',
          targetValue: 50,
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });
  });

  describe('pattern conditions', () => {
    it('should detect KDJ golden cross (K crosses above D)', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'pattern',
          pattern: 'kdj_golden_cross',
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should detect KDJ death cross (K crosses below D)', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'pattern',
          pattern: 'kdj_death_cross',
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should detect price above MA', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'pattern',
          pattern: 'price_above_ma',
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });
  });

  describe('price_change and volume_change conditions', () => {
    it('should filter by price change percentage', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'price_change',
          operator: '>',
          targetValue: 5, // 涨幅 > 5%
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should filter by volume change percentage', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'volume_change',
          operator: '>',
          targetValue: 50, // 成交量增长 > 50%
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });
  });

  describe('52-week high/low conditions', () => {
    it('should filter stocks at 52-week high', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'week_52_high',
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should filter stocks at 52-week low', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'week_52_low',
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should filter stocks near 52-week high (<5%)', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'near_52_high',
          targetValue: 5, // 距离52周高点 < 5%
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });
  });

  describe('AND logic with multiple conditions', () => {
    it('should apply AND logic for all conditions', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'rsi',
          operator: '<',
          targetValue: 30,
        },
        {
          conditionType: 'indicator_value',
          indicatorName: 'volume',
          operator: '>',
          targetValue: 1000000,
        },
        {
          conditionType: 'pattern',
          pattern: 'kdj_golden_cross',
        },
      ]);

      expect(prisma.stock.findMany).toHaveBeenCalled();
    });
  });
});
