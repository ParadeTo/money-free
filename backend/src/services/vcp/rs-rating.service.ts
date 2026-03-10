import { Injectable, Logger } from '@nestjs/common';

export interface StockReturn {
  stockCode: string;
  oneYearReturn: number;
}

export interface RsRatingResult {
  stockCode: string;
  rsRating: number;
  oneYearReturn: number;
  rankInUniverse: number;
  universeSize: number;
}

@Injectable()
export class RsRatingService {
  private readonly logger = new Logger(RsRatingService.name);

  calculateOneYearReturn(currentClose: number, closeOneYearAgo: number): number {
    if (closeOneYearAgo <= 0) return 0;
    return (currentClose / closeOneYearAgo) - 1;
  }

  calculatePercentileRank(value: number, allValues: number[]): number {
    if (allValues.length === 0) return 0;
    const countBelow = allValues.filter(v => v < value).length;
    const countEqual = allValues.filter(v => v === value).length;
    return ((countBelow + 0.5 * countEqual) / allValues.length) * 100;
  }

  calculateAllRsRatings(stockReturns: StockReturn[]): RsRatingResult[] {
    if (stockReturns.length === 0) return [];

    const allReturns = stockReturns.map(s => s.oneYearReturn);
    const sorted = [...allReturns].sort((a, b) => a - b);

    return stockReturns.map(stock => {
      const rsRating = this.calculatePercentileRank(stock.oneYearReturn, allReturns);
      const rankInUniverse = sorted.filter(v => v <= stock.oneYearReturn).length;

      return {
        stockCode: stock.stockCode,
        rsRating: Math.round(rsRating * 100) / 100,
        oneYearReturn: stock.oneYearReturn,
        rankInUniverse,
        universeSize: stockReturns.length,
      };
    });
  }
}
