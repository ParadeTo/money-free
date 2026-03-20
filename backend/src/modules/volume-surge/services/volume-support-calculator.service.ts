import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VolumeSupport } from '../../../types/scan.types';

@Injectable()
export class VolumeSupportCalculatorService {
  private readonly logger = new Logger(VolumeSupportCalculatorService.name);
  private readonly SUPPORT_THRESHOLD = 1.2;

  constructor(private readonly prisma: PrismaService) {}

  async calculateVolumeSupport(
    stockCode: string,
    expansionStartDate: Date,
  ): Promise<VolumeSupport> {
    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
        date: { gte: expansionStartDate },
      },
      orderBy: { date: 'asc' },
      take: 30,
    });

    if (klineData.length === 0) {
      this.logger.warn(`股票 ${stockCode} 在放大期后无K线数据`);
      return { upDayAvgVolume: 0, downDayAvgVolume: 0, ratio: 0 };
    }

    const upDays = klineData.filter((k) => k.close > k.open);
    const downDays = klineData.filter((k) => k.close < k.open);

    if (upDays.length === 0 && downDays.length === 0) {
      this.logger.warn(`股票 ${stockCode} 放大期后全是平盘日`);
      return { upDayAvgVolume: 0, downDayAvgVolume: 0, ratio: 1 };
    }

    if (downDays.length === 0) {
      const upAvg = upDays.reduce((sum, k) => sum + k.volume, 0) / upDays.length;
      this.logger.log(`股票 ${stockCode} 放大期后全是上涨日，自动符合买量支撑条件`);
      return { upDayAvgVolume: upAvg, downDayAvgVolume: 0, ratio: 9999 };
    }

    if (upDays.length === 0) {
      const downAvg = downDays.reduce((sum, k) => sum + k.volume, 0) / downDays.length;
      this.logger.log(`股票 ${stockCode} 放大期后全是下降日，不符合买量支撑条件`);
      return { upDayAvgVolume: 0, downDayAvgVolume: downAvg, ratio: 0 };
    }

    const upAvg = upDays.reduce((sum, k) => sum + k.volume, 0) / upDays.length;
    const downAvg = downDays.reduce((sum, k) => sum + k.volume, 0) / downDays.length;
    const ratio = upAvg / downAvg;

    return {
      upDayAvgVolume: upAvg,
      downDayAvgVolume: downAvg,
      ratio,
    };
  }

  isSupportSufficient(upDayAvgVolume: number, downDayAvgVolume: number): boolean {
    if (downDayAvgVolume === 0) {
      return upDayAvgVolume > 0;
    }

    if (upDayAvgVolume === 0) {
      return false;
    }

    return upDayAvgVolume / downDayAvgVolume >= this.SUPPORT_THRESHOLD;
  }

  async getDetailedSupport(stockCode: string, expansionStartDate: Date) {
    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        period: 'daily',
        date: { gte: expansionStartDate },
      },
      orderBy: { date: 'asc' },
      take: 30,
    });

    const upDays = klineData.filter((k) => k.close > k.open);
    const downDays = klineData.filter((k) => k.close < k.open);
    const flatDays = klineData.filter((k) => k.close === k.open);

    const nonCompliantDays = upDays.filter((upDay) => {
      const closestDownDay = downDays.find(
        (d) => Math.abs(d.date.getTime() - upDay.date.getTime()) < 7 * 24 * 60 * 60 * 1000,
      );
      return closestDownDay && upDay.volume < closestDownDay.volume;
    });

    return {
      upDays: upDays.map((d) => ({
        date: d.date,
        volume: d.volume,
        priceChange: ((d.close - d.open) / d.open) * 100,
      })),
      downDays: downDays.map((d) => ({
        date: d.date,
        volume: d.volume,
        priceChange: ((d.close - d.open) / d.open) * 100,
      })),
      flatDays: flatDays.map((d) => ({
        date: d.date,
        volume: d.volume,
      })),
      nonCompliantDays: nonCompliantDays.map((d) => d.date),
    };
  }
}
