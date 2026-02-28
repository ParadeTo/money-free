// backend/src/modules/screener/screener.service.ts
// T141-T147 [US2] ScreenerService with executeFilter() and all filter implementations

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FilterConditionDto } from './dto/execute-filter.dto';

@Injectable()
export class ScreenerService {
  private readonly logger = new Logger(ScreenerService.name);
  private prisma = new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * T141: Execute filter with multiple conditions (AND logic)
   * T146: Add result limiting (max 100 stocks)
   * T147: Add sorting support
   */
  async executeFilter(
    conditions: FilterConditionDto[],
    sortBy: string = 'stockCode',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{
    stocks: any[];
    isTruncated: boolean;
    totalCount: number;
  }> {
    this.logger.log(`Executing filter with ${conditions.length} conditions`);

    try {
      // Get all active stocks
      let stocks = await this.prisma.stock.findMany({
        where: {
          admissionStatus: 'active',
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      });

      // Apply each condition (AND logic)
      for (const condition of conditions) {
        stocks = await this.applyCondition(stocks, condition);
      }

      const totalCount = stocks.length;
      const isTruncated = totalCount > 100;
      const limitedStocks = stocks.slice(0, 100);

      // Enrich with latest price data
      const enrichedStocks = await this.enrichWithPriceData(limitedStocks);

      return {
        stocks: enrichedStocks,
        isTruncated,
        totalCount,
      };
    } catch (error: any) {
      this.logger.error(`Filter execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply single filter condition to stock list
   */
  private async applyCondition(
    stocks: any[],
    condition: FilterConditionDto,
  ): Promise<any[]> {
    const stockCodes = stocks.map((s) => s.stockCode);

    switch (condition.conditionType) {
      case 'indicator_value':
        return this.filterByIndicatorValue(
          stockCodes,
          condition.indicatorName!,
          condition.operator!,
          condition.targetValue!,
        );

      case 'pattern':
        return this.filterByPattern(stockCodes, condition.pattern!);

      case 'price_change':
        return this.filterByPriceChange(
          stockCodes,
          condition.operator!,
          condition.targetValue!,
        );

      case 'volume_change':
        return this.filterByVolumeChange(
          stockCodes,
          condition.operator!,
          condition.targetValue!,
        );

      case 'week_52_high':
        return this.filterByWeek52High(stockCodes);

      case 'week_52_low':
        return this.filterByWeek52Low(stockCodes);

      case 'near_52_high':
        return this.filterNear52High(stockCodes, condition.targetValue || 5);

      case 'near_52_low':
        return this.filterNear52Low(stockCodes, condition.targetValue || 5);

      default:
        return stocks;
    }
  }

  /**
   * T142: Filter by indicator value comparison
   */
  private async filterByIndicatorValue(
    stockCodes: string[],
    indicatorName: string,
    operator: string,
    targetValue: number,
  ): Promise<any[]> {
    const result: any[] = [];

    // 确定需要查询的指标类型
    let indicatorType: string;
    let valueKey: string;

    if (indicatorName === 'rsi') {
      indicatorType = 'rsi';
      valueKey = 'rsi';
    } else if (indicatorName.startsWith('ma')) {
      indicatorType = 'ma';
      valueKey = indicatorName; // ma50, ma150, ma200
    } else if (indicatorName.startsWith('kdj_')) {
      indicatorType = 'kdj';
      valueKey = indicatorName.replace('kdj_', ''); // k, d, j
    } else if (indicatorName === 'volume') {
      indicatorType = 'volume';
      valueKey = 'volume';
    } else if (indicatorName === 'amount') {
      indicatorType = 'amount';
      valueKey = 'amount';
    } else {
      return result; // 未知指标类型
    }

    for (const stockCode of stockCodes) {
      // Get latest indicator value for this stock with specific indicator type
      const indicator = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType, // 指定指标类型
        },
        orderBy: {
          date: 'desc',
        },
      });

      if (!indicator) continue;

      const values = JSON.parse(indicator.values);
      const actualValue = values[valueKey];

      if (actualValue !== undefined) {
        if (this.compareValues(actualValue, operator, targetValue)) {
          const stock = await this.prisma.stock.findUnique({
            where: { stockCode },
          });
          if (stock) result.push(stock);
        }
      }
    }

    return result;
  }

  /**
   * T143: Filter by technical patterns
   */
  private async filterByPattern(
    stockCodes: string[],
    pattern: string,
  ): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const matches = await this.checkPattern(stockCode, pattern);
      if (matches) {
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * Check if stock matches pattern
   */
  private async checkPattern(
    stockCode: string,
    pattern: string,
  ): Promise<boolean> {
    const indicators = await this.prisma.technicalIndicator.findMany({
      where: {
        stockCode,
        period: 'daily',
        indicatorType: 'kdj',
      },
      orderBy: {
        date: 'desc',
      },
      take: 2,
    });

    if (indicators.length < 2) return false;

    const today = JSON.parse(indicators[0].values);
    const yesterday = JSON.parse(indicators[1].values);

    if (pattern === 'kdj_golden_cross') {
      // K crosses above D
      return yesterday.k <= yesterday.d && today.k > today.d;
    } else if (pattern === 'kdj_death_cross') {
      // K crosses below D
      return yesterday.k >= yesterday.d && today.k < today.d;
    } else if (pattern === 'price_above_ma') {
      const kline = await this.prisma.kLineData.findFirst({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
      });
      const ma = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType: 'ma',
        },
        orderBy: { date: 'desc' },
      });
      if (!kline || !ma) return false;
      const maValues = JSON.parse(ma.values);
      return kline.close > (maValues.ma50 || 0);
    } else if (pattern === 'price_below_ma') {
      const kline = await this.prisma.kLineData.findFirst({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
      });
      const ma = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType: 'ma',
        },
        orderBy: { date: 'desc' },
      });
      if (!kline || !ma) return false;
      const maValues = JSON.parse(ma.values);
      return kline.close < (maValues.ma50 || 0);
    }

    return false;
  }

  /**
   * T144: Filter by price change percentage
   */
  private async filterByPriceChange(
    stockCodes: string[],
    operator: string,
    targetPercent: number,
  ): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const klines = await this.prisma.kLineData.findMany({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
        take: 2,
      });

      if (klines.length < 2) continue;

      const today = klines[0];
      const yesterday = klines[1];
      const changePercent =
        ((today.close - yesterday.close) / yesterday.close) * 100;

      if (this.compareValues(changePercent, operator, targetPercent)) {
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * T144: Filter by volume change percentage
   */
  private async filterByVolumeChange(
    stockCodes: string[],
    operator: string,
    targetPercent: number,
  ): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const klines = await this.prisma.kLineData.findMany({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
        take: 2,
      });

      if (klines.length < 2) continue;

      const today = klines[0];
      const yesterday = klines[1];
      const changePercent =
        ((today.volume - yesterday.volume) / yesterday.volume) * 100;

      if (this.compareValues(changePercent, operator, targetPercent)) {
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * T145: Filter by 52-week high
   */
  private async filterByWeek52High(stockCodes: string[]): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const kline = await this.prisma.kLineData.findFirst({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
      });

      const marker = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType: 'week52_marker',
        },
        orderBy: { date: 'desc' },
      });

      if (!kline || !marker) continue;

      const markerValues = JSON.parse(marker.values);
      if (kline.close >= markerValues.high * 0.99) {
        // Within 1% of 52-week high
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * T145: Filter by 52-week low
   */
  private async filterByWeek52Low(stockCodes: string[]): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const kline = await this.prisma.kLineData.findFirst({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
      });

      const marker = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType: 'week52_marker',
        },
        orderBy: { date: 'desc' },
      });

      if (!kline || !marker) continue;

      const markerValues = JSON.parse(marker.values);
      if (kline.close <= markerValues.low * 1.01) {
        // Within 1% of 52-week low
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * Filter stocks near 52-week high
   */
  private async filterNear52High(
    stockCodes: string[],
    percentThreshold: number,
  ): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const kline = await this.prisma.kLineData.findFirst({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
      });

      const marker = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType: 'week52_marker',
        },
        orderBy: { date: 'desc' },
      });

      if (!kline || !marker) continue;

      const markerValues = JSON.parse(marker.values);
      const percentFromHigh =
        ((markerValues.high - kline.close) / markerValues.high) * 100;

      if (percentFromHigh <= percentThreshold) {
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * Filter stocks near 52-week low
   */
  private async filterNear52Low(
    stockCodes: string[],
    percentThreshold: number,
  ): Promise<any[]> {
    const result: any[] = [];

    for (const stockCode of stockCodes) {
      const kline = await this.prisma.kLineData.findFirst({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
      });

      const marker = await this.prisma.technicalIndicator.findFirst({
        where: {
          stockCode,
          period: 'daily',
          indicatorType: 'week52_marker',
        },
        orderBy: { date: 'desc' },
      });

      if (!kline || !marker) continue;

      const markerValues = JSON.parse(marker.values);
      const percentFromLow =
        ((kline.close - markerValues.low) / markerValues.low) * 100;

      if (percentFromLow <= percentThreshold) {
        const stock = await this.prisma.stock.findUnique({
          where: { stockCode },
        });
        if (stock) result.push(stock);
      }
    }

    return result;
  }

  /**
   * Compare values with operator
   */
  private compareValues(
    actual: number,
    operator: string,
    target: number,
  ): boolean {
    switch (operator) {
      case '>':
        return actual > target;
      case '<':
        return actual < target;
      case '>=':
        return actual >= target;
      case '<=':
        return actual <= target;
      case '=':
        return Math.abs(actual - target) < 0.01;
      default:
        return false;
    }
  }

  /**
   * Enrich stocks with latest price data
   */
  private async enrichWithPriceData(stocks: any[]): Promise<any[]> {
    const enriched = [];

    for (const stock of stocks) {
      const klines = await this.prisma.kLineData.findMany({
        where: { stockCode: stock.stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
        take: 2,
      });

      if (klines.length > 0) {
        const latest = klines[0];
        const previous = klines[1];

        let priceChange = 0;
        let priceChangePercent = 0;

        if (previous) {
          priceChange = latest.close - previous.close;
          priceChangePercent = (priceChange / previous.close) * 100;
        }

        enriched.push({
          stockCode: stock.stockCode,
          stockName: stock.stockName,
          market: stock.market,
          latestPrice: latest.close,
          priceChange,
          priceChangePercent: Number(priceChangePercent.toFixed(2)),
          volume: latest.volume,
          amount: latest.amount,
          marketCap: stock.marketCap,
        });
      } else {
        enriched.push({
          stockCode: stock.stockCode,
          stockName: stock.stockName,
          market: stock.market,
          marketCap: stock.marketCap,
        });
      }
    }

    return enriched;
  }
}
