/**
 * IncrementalIndicatorCalculator单元测试
 */

import { PrismaClient } from '@prisma/client';
import { IncrementalIndicatorCalculator } from '../../src/scripts/incremental-indicator-calculator';
import { subDays } from 'date-fns';

const mockPrisma = {
  kLineData: {
    findMany: jest.fn(),
  },
  technicalIndicator: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('IncrementalIndicatorCalculator', () => {
  let calculator: IncrementalIndicatorCalculator;

  beforeEach(() => {
    jest.clearAllMocks();
    calculator = new IncrementalIndicatorCalculator(mockPrisma);
  });

  describe('calculateIndicatorWindow', () => {
    it('should calculate window with 364-day lookback', () => {
      const startDate = new Date('2024-03-15');
      const endDate = new Date('2024-03-20');

      const window = calculator.calculateIndicatorWindow(startDate, endDate);

      expect(window.windowSize).toBe(364);
      expect(window.startDate).toEqual(subDays(startDate, 364));
      expect(window.endDate).toEqual(endDate);
    });
  });

  describe('recalculateIndicators', () => {
    it('should fetch K-line data and recalculate indicators', async () => {
      const mockKLineData = [
        {
          stockCode: 'SH600000',
          date: new Date('2024-01-01'),
          open: 10,
          high: 11,
          low: 9,
          close: 10.5,
          volume: 1000,
          amount: 10500,
        },
        {
          stockCode: 'SH600000',
          date: new Date('2024-01-02'),
          open: 10.5,
          high: 11.5,
          low: 10,
          close: 11,
          volume: 1200,
          amount: 13200,
        },
      ];

      (mockPrisma.kLineData.findMany as jest.Mock).mockResolvedValue(mockKLineData);

      await calculator.recalculateIndicators(
        'SH600000',
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );

      expect(mockPrisma.kLineData.findMany).toHaveBeenCalled();
      expect(mockPrisma.technicalIndicator.deleteMany).toHaveBeenCalledWith({
        where: {
          stockCode: 'SH600000',
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-02'),
          },
        },
      });
      expect(mockPrisma.technicalIndicator.createMany).toHaveBeenCalled();
    });

    it('should warn if no K-line data found', async () => {
      (mockPrisma.kLineData.findMany as jest.Mock).mockResolvedValue([]);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await calculator.recalculateIndicators(
        'SH600000',
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('没有K线数据'),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('batchRecalculate', () => {
    it('should process multiple stocks', async () => {
      const stocks = [
        { stockCode: 'SH600000' },
        { stockCode: 'SZ000001' },
      ];

      (mockPrisma.kLineData.findMany as jest.Mock).mockResolvedValue([
        {
          stockCode: 'SH600000',
          date: new Date('2024-01-01'),
          open: 10,
          high: 11,
          low: 9,
          close: 10.5,
          volume: 1000,
          amount: 10500,
        },
      ]);

      await calculator.batchRecalculate(
        stocks,
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );

      expect(mockPrisma.kLineData.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
