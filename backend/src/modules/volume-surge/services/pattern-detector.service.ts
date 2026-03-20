import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VolumePattern } from '../../../types/scan.types';

@Injectable()
export class PatternDetectorService {
  private readonly logger = new Logger(PatternDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async detectPattern(
    stockCode: string,
    mode: string,
    referenceDate?: Date,
  ): Promise<VolumePattern | null> {
    if (mode === 'MANUAL' && referenceDate) {
      return this.detectPatternManual(stockCode, referenceDate);
    }
    return this.detectPatternAuto(stockCode);
  }

  async detectContractionPeriod(
    stockCode: string,
    beforeDate?: Date,
  ): Promise<{ startDate: Date; endDate: Date; avgVolume: number } | null> {
    const endDate = beforeDate || new Date();

    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
        date: { lte: endDate },
      },
      orderBy: { date: 'desc' },
      take: 30,
    });

    if (klineData.length < 25) {
      this.logger.debug(`股票 ${stockCode} K线数据不足（需要25天，实际${klineData.length}天）`);
      return null;
    }

    const recentVolumes = klineData.slice(0, 5).map((k) => k.volume);
    const previousVolumes = klineData.slice(5, 25).map((k) => k.volume);

    const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const previousAvg = previousVolumes.reduce((a, b) => a + b, 0) / previousVolumes.length;

    const threshold = previousAvg * 0.7;

    if (recentAvg < threshold) {
      this.logger.log(
        `股票 ${stockCode} 检测到萎缩期: ${recentAvg.toFixed(0)} < ${threshold.toFixed(0)}`,
      );
      return {
        startDate: klineData[4].date,
        endDate: klineData[0].date,
        avgVolume: recentAvg,
      };
    }

    this.logger.debug(`股票 ${stockCode} 未检测到萎缩期`);
    return null;
  }

  async detectExpansionPoint(
    stockCode: string,
    contractionEndDate: Date,
    contractionAvgVolume: number,
  ): Promise<{ date: Date; volume: number; multiplier: number; days: number } | null> {
    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
        date: { gt: contractionEndDate },
      },
      orderBy: { date: 'asc' },
      take: 30,
    });

    if (klineData.length === 0) {
      this.logger.debug(`股票 ${stockCode} 在萎缩期后无K线数据`);
      return null;
    }

    const threshold = contractionAvgVolume * 1.5;

    for (let i = 0; i < klineData.length; i++) {
      const k = klineData[i];
      if (k.volume >= threshold) {
        const multiplier = k.volume / contractionAvgVolume;
        const expansionDays = klineData.length - i;

        this.logger.log(
          `股票 ${stockCode} 检测到放大点: ${k.volume.toFixed(0)} (${multiplier.toFixed(2)}x)`,
        );
        return {
          date: k.date,
          volume: k.volume,
          multiplier,
          days: expansionDays,
        };
      }
    }

    this.logger.debug(`股票 ${stockCode} 未检测到放大点`);
    return null;
  }

  private async detectPatternAuto(stockCode: string): Promise<VolumePattern | null> {
    const contraction = await this.detectContractionPeriod(stockCode);
    if (!contraction) {
      return null;
    }

    const expansion = await this.detectExpansionPoint(
      stockCode,
      contraction.endDate,
      contraction.avgVolume,
    );

    if (!expansion) {
      return null;
    }

    return {
      contractionPeriod: contraction,
      expansionPoint: expansion,
    };
  }

  private async detectPatternManual(
    stockCode: string,
    referenceDate: Date,
  ): Promise<VolumePattern | null> {
    const contraction = await this.detectContractionPeriod(stockCode, referenceDate);
    if (!contraction) {
      return null;
    }

    const expansion = await this.detectExpansionPoint(
      stockCode,
      referenceDate,
      contraction.avgVolume,
    );

    if (!expansion) {
      return null;
    }

    return {
      contractionPeriod: {
        ...contraction,
        endDate: referenceDate,
      },
      expansionPoint: expansion,
    };
  }
}
