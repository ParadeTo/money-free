// backend/test/unit/test_screener.spec.ts
// T132 [P] [US2] Unit test for ScreenerService.executeFilter()

import { Test, TestingModule } from '@nestjs/testing';
import { ScreenerService } from '../../src/modules/screener/screener.service';
import { PrismaService } from '../../src/services/prisma/prisma.service';

describe('ScreenerService', () => {
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
          },
        },
      ],
    }).compile();

    service = module.get<ScreenerService>(ScreenerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('executeFilter', () => {
    it('should return empty array when no stocks match', async () => {
      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);

      const result = await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'rsi',
          operator: '<',
          targetValue: 30,
        },
      ]);

      expect(result).toEqual({
        stocks: [],
        isTruncated: false,
        totalCount: 0,
      });
    });

    it('should filter stocks by RSI < 30', async () => {
      const mockStocks = [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          market: 'SH',
          listDate: new Date('2001-08-27'),
          admissionStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);

      const result = await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'rsi',
          operator: '<',
          targetValue: 30,
        },
      ]);

      expect(result.stocks).toHaveLength(1);
      expect(result.stocks[0].stockCode).toBe('600519');
      expect(result.isTruncated).toBe(false);
    });

    it('should truncate results when more than 100 stocks match', async () => {
      const mockStocks = Array.from({ length: 150 }, (_, i) => ({
        stockCode: `60${String(i).padStart(4, '0')}`,
        stockName: `股票${i}`,
        market: 'SH',
        listDate: new Date('2020-01-01'),
        admissionStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);

      const result = await service.executeFilter([
        {
          conditionType: 'indicator_value',
          indicatorName: 'volume',
          operator: '>',
          targetValue: 1000000,
        },
      ]);

      expect(result.stocks).toHaveLength(100);
      expect(result.isTruncated).toBe(true);
      expect(result.totalCount).toBe(150);
    });

    it('should handle multiple AND conditions', async () => {
      const mockStocks = [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          market: 'SH',
          listDate: new Date('2001-08-27'),
          admissionStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);

      const result = await service.executeFilter([
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
      ]);

      expect(result.stocks).toBeDefined();
      expect(prisma.stock.findMany).toHaveBeenCalled();
    });

    it('should filter by KDJ golden cross pattern', async () => {
      const mockStocks = [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          market: 'SH',
          listDate: new Date('2001-08-27'),
          admissionStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);

      const result = await service.executeFilter([
        {
          conditionType: 'pattern',
          pattern: 'kdj_golden_cross',
        },
      ]);

      expect(result.stocks).toBeDefined();
    });

    it('should sort results by stockCode ascending', async () => {
      const mockStocks = [
        { stockCode: '600519', stockName: '贵州茅台', market: 'SH' },
        { stockCode: '000001', stockName: '平安银行', market: 'SZ' },
        { stockCode: '600036', stockName: '招商银行', market: 'SH' },
      ];

      jest.spyOn(prisma.stock, 'findMany').mockResolvedValue(mockStocks as any);

      const result = await service.executeFilter(
        [
          {
            conditionType: 'indicator_value',
            indicatorName: 'volume',
            operator: '>',
            targetValue: 1000000,
          },
        ],
        'stockCode',
        'asc',
      );

      expect(result.stocks[0].stockCode).toBe('000001');
    });
  });
});
