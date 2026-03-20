import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MovingAverageTrend } from '../../../types/scan.types';

@Injectable()
export class MovingAverageService {
  private readonly logger = new Logger(MovingAverageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateMovingAverage(stockCode: string, period: number): Promise<number | null> {
    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
      },
      orderBy: { date: 'desc' },
      take: period,
      select: { close: true },
    });

    if (klineData.length < period) {
      this.logger.warn(`股票 ${stockCode} 数据不足 ${period} 天，实际 ${klineData.length} 天`);
      return null;
    }

    const sum = klineData.reduce((acc, k) => acc + k.close, 0);
    return sum / period;
  }

  async calculateMA50Slope(stockCode: string): Promise<number | null> {
    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
      },
      orderBy: { date: 'desc' },
      take: 150,
    });

    if (klineData.length < 150) {
      return null;
    }

    const ma50Values: number[] = [];
    for (let i = 0; i < 5; i++) {
      const slice = klineData.slice(i, i + 50);
      const sum = slice.reduce((acc, k) => acc + k.close, 0);
      ma50Values.push(sum / 50);
    }

    ma50Values.reverse();

    const n = ma50Values.length;
    const x = [1, 2, 3, 4, 5];
    const y = ma50Values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  async getMovingAverageTrend(stockCode: string): Promise<MovingAverageTrend | null> {
    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
      },
      orderBy: { date: 'desc' },
      take: 150,
    });

    if (klineData.length < 150) {
      this.logger.warn(`股票 ${stockCode} 数据不足150天，无法计算均线`);
      return null;
    }

    const closes = klineData.map((k) => k.close);

    const ma50 = closes.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
    const ma150 = closes.reduce((a, b) => a + b, 0) / 150;

    const slope = await this.calculateMA50Slope(stockCode);
    if (slope === null) {
      return null;
    }

    return {
      ma50,
      ma150,
      ma50Slope: slope,
      isTrendingUp: slope > 0,
      ma50BelowMa150: ma50 < ma150,
    };
  }
}
