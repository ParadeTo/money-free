/**
 * 增量指标计算器
 */

import { PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

export interface IndicatorWindow {
  startDate: Date;
  endDate: Date;
  windowSize: number; // 需要向前查询的额外天数
}

export class IncrementalIndicatorCalculator {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 计算需要重新计算指标的日期范围
   * @param stockCode 股票代码
   * @param newDataStartDate 新增数据的起始日期
   * @param newDataEndDate 新增数据的结束日期
   * @returns 指标计算窗口
   */
  calculateIndicatorWindow(newDataStartDate: Date, newDataEndDate: Date): IndicatorWindow {
    // MA60需要60天历史数据
    // KDJ需要约15天历史数据
    // RSI14需要14天历史数据
    // 52周标记需要52周(364天)历史数据

    const maxWindowSize = 364; // 52周,覆盖所有指标需求

    return {
      startDate: subDays(newDataStartDate, maxWindowSize),
      endDate: newDataEndDate,
      windowSize: maxWindowSize,
    };
  }

  /**
   * 为指定股票重新计算指标
   * @param stockCode 股票代码
   * @param startDate 起始日期
   * @param endDate 结束日期
   */
  async recalculateIndicators(stockCode: string, startDate: Date, endDate: Date): Promise<void> {
    // 获取窗口范围内的K线数据
    const window = this.calculateIndicatorWindow(startDate, endDate);

    const klineData = await this.prisma.kLineData.findMany({
      where: {
        stockCode,
        date: {
          gte: window.startDate,
          lte: window.endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (klineData.length === 0) {
      console.warn(`⚠️ 股票 ${stockCode} 在指定范围内没有K线数据`);
      return;
    }

    // 先删除需要重新计算范围内的旧指标
    await this.prisma.technicalIndicator.deleteMany({
      where: {
        stockCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 计算各类指标
    const maIndicators = this.calculateMA(klineData, startDate, endDate);
    const kdjIndicators = this.calculateKDJ(klineData, startDate, endDate);
    const rsiIndicators = this.calculateRSI(klineData, startDate, endDate);
    const volumeIndicators = this.calculateVolumeIndicators(klineData, startDate, endDate);
    const week52Indicators = this.calculate52WeekMarkers(klineData, startDate, endDate);

    // 合并所有指标
    const allIndicators = [
      ...maIndicators,
      ...kdjIndicators,
      ...rsiIndicators,
      ...volumeIndicators,
      ...week52Indicators,
    ];

    // 批量插入新指标
    if (allIndicators.length > 0) {
      await this.prisma.technicalIndicator.createMany({
        data: allIndicators.map((indicator) => ({
          stockCode,
          date: indicator.date,
          period: 'daily',
          indicatorType: indicator.indicatorType,
          values: indicator.values,
        })),
      });
    }
  }

  /**
   * 计算移动平均线(MA5, MA10, MA20, MA60)
   */
  private calculateMA(klineData: any[], startDate: Date, endDate: Date): any[] {
    const indicators: any[] = [];
    const periods = [5, 10, 20, 60];

    klineData.forEach((data, index) => {
      if (data.date < startDate || data.date > endDate) return;

      const values: any = {};
      periods.forEach((period) => {
        if (index + 1 >= period) {
          const sum = klineData
            .slice(index - period + 1, index + 1)
            .reduce((acc, d) => acc + d.close, 0);
          values[`ma${period}`] = sum / period;
        }
      });

      if (Object.keys(values).length > 0) {
        indicators.push({
          date: data.date,
          indicatorType: 'ma',
          values,
        });
      }
    });

    return indicators;
  }

  /**
   * 计算KDJ指标
   */
  private calculateKDJ(klineData: any[], startDate: Date, endDate: Date): any[] {
    // 简化实现,实际应使用完整的KDJ算法
    return [];
  }

  /**
   * 计算RSI指标
   */
  private calculateRSI(klineData: any[], startDate: Date, endDate: Date): any[] {
    // 简化实现,实际应使用完整的RSI算法
    return [];
  }

  /**
   * 计算成交量指标
   */
  private calculateVolumeIndicators(klineData: any[], startDate: Date, endDate: Date): any[] {
    const indicators: any[] = [];

    klineData.forEach((data) => {
      if (data.date < startDate || data.date > endDate) return;

      indicators.push({
        date: data.date,
        indicatorType: 'volume',
        values: {
          volume: data.volume,
          amount: data.amount,
        },
      });
    });

    return indicators;
  }

  /**
   * 计算52周高低点标记
   */
  private calculate52WeekMarkers(klineData: any[], startDate: Date, endDate: Date): any[] {
    const indicators: any[] = [];
    const weekSize = 364; // 52周

    klineData.forEach((data, index) => {
      if (data.date < startDate || data.date > endDate) return;

      // 获取过去52周的数据
      const weekData = klineData.slice(Math.max(0, index - weekSize + 1), index + 1);

      if (weekData.length > 0) {
        const high52 = Math.max(...weekData.map((d) => d.high));
        const low52 = Math.min(...weekData.map((d) => d.low));

        indicators.push({
          date: data.date,
          indicatorType: 'week52_marker',
          values: {
            high52,
            low52,
          },
        });
      }
    });

    return indicators;
  }

  /**
   * 批量重新计算多只股票的指标
   * @param stocks 股票列表
   * @param startDate 起始日期
   * @param endDate 结束日期
   */
  async batchRecalculate(
    stocks: { stockCode: string }[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    console.log(`📊 开始批量重新计算 ${stocks.length} 只股票的技术指标...`);

    let completed = 0;
    for (const stock of stocks) {
      try {
        await this.recalculateIndicators(stock.stockCode, startDate, endDate);
        completed++;

        if (completed % 100 === 0) {
          console.log(`  进度: ${completed}/${stocks.length}`);
        }
      } catch (error: any) {
        console.error(`❌ 计算股票 ${stock.stockCode} 指标失败: ${error.message}`);
      }
    }

    console.log(`✅ 批量指标计算完成: ${completed}/${stocks.length}`);
  }
}
