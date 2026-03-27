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

    // 改进算法：寻找持续放量的起点，而不是单日放量
    for (let i = 0; i < klineData.length - 4; i++) {
      const k = klineData[i];
      
      // 检查这一天的成交量是否放大
      if (k.volume >= threshold) {
        // 验证持续性：检查后续3-5天的成交量是否维持在较高水平
        const nextFewDays = klineData.slice(i, Math.min(i + 5, klineData.length));
        const sustainedDays = nextFewDays.filter(d => d.volume >= contractionAvgVolume * 1.2).length;
        
        // 至少3天维持在1.2倍以上，才算有效放量
        if (sustainedDays >= 3) {
          // 计算放量期的平均成交量
          const expansionAvgVolume = nextFewDays.reduce((sum, d) => sum + d.volume, 0) / nextFewDays.length;
          const multiplier = expansionAvgVolume / contractionAvgVolume;
          const expansionDays = klineData.length - i;

          this.logger.log(
            `股票 ${stockCode} 检测到持续放大: ${expansionAvgVolume.toFixed(0)} (${multiplier.toFixed(2)}x, 持续${sustainedDays}天)`,
          );
          return {
            date: k.date,
            volume: expansionAvgVolume,
            multiplier,
            days: expansionDays,
          };
        }
      }
    }

    this.logger.debug(`股票 ${stockCode} 未检测到持续放大`);
    return null;
  }

  private async detectPatternAuto(stockCode: string): Promise<VolumePattern | null> {
    // AUTO模式：检测最近一周是否相比前几周成交量放大
    const klines = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
      },
      orderBy: { date: 'desc' },
      take: 30,
    });

    if (klines.length < 15) {
      return null;
    }

    // 最近一周（5个交易日）的平均成交量
    const recentWeek = klines.slice(0, 5);
    const recentAvg = recentWeek.reduce((sum, k) => sum + k.volume, 0) / recentWeek.length;

    // 前2-3周（10-20个交易日）的平均成交量作为基准
    const previousWeeks = klines.slice(5, 20);
    const previousAvg = previousWeeks.reduce((sum, k) => sum + k.volume, 0) / previousWeeks.length;

    const multiplier = recentAvg / previousAvg;

    // 放大倍数≥1.5，且最近一周内至少3天成交量超过基准的1.2倍
    const threshold = previousAvg * 1.2;
    const sustainedDays = recentWeek.filter(k => k.volume >= threshold).length;

    if (multiplier >= 1.5 && sustainedDays >= 3) {
      this.logger.log(
        `股票 ${stockCode} 检测到最近一周持续放量: ${recentAvg.toFixed(0)} vs ${previousAvg.toFixed(0)} (${multiplier.toFixed(2)}x, ${sustainedDays}天维持高位)`,
      );

      return {
        contractionPeriod: {
          startDate: previousWeeks[previousWeeks.length - 1].date,
          endDate: previousWeeks[0].date,
          avgVolume: previousAvg,
        },
        expansionPoint: {
          date: recentWeek[recentWeek.length - 1].date,
          volume: recentAvg,
          multiplier,
          days: 5,
        },
      };
    }

    return null;
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
