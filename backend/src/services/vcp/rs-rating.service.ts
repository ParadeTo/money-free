import { Injectable } from '@nestjs/common';

/**
 * IBD RS Rating 所需的四个历史价格点
 * 参考 IBD Relative Strength Rating 计算方法：
 *   score = 2*(P_now/P_3mo) + (P_now/P_6mo) + (P_now/P_9mo) + (P_now/P_12mo)
 * 最近一个季度权重为 2x，其余各季度权重各 1x
 */
export interface IbdStockPrices {
  stockCode: string;
  currentPrice: number;
  price3MonthsAgo: number; // ~63 交易日前
  price6MonthsAgo: number; // ~126 交易日前
  price9MonthsAgo: number; // ~189 交易日前
  price12MonthsAgo: number; // ~252 交易日前
}

export interface RsRatingResult {
  stockCode: string;
  /** IBD 风格评级，范围 1-99 */
  rsRating: number;
  /** 原始 IBD 加权分数 */
  ibdScore: number;
  rankInUniverse: number;
  universeSize: number;
}

@Injectable()
export class RsRatingService {
  /**
   * 计算单支股票的 IBD 加权相对强度分数
   * 公式：score = 2*(P/P3mo) + (P/P6mo) + (P/P9mo) + (P/P12mo)
   * 若某历史价格缺失（<=0），该比值以 1 替代（不贡献涨跌）
   */
  calculateIbdScore(prices: IbdStockPrices): number {
    const { currentPrice, price3MonthsAgo, price6MonthsAgo, price9MonthsAgo, price12MonthsAgo } =
      prices;

    const ratio3 = price3MonthsAgo > 0 ? currentPrice / price3MonthsAgo : 1;
    const ratio6 = price6MonthsAgo > 0 ? currentPrice / price6MonthsAgo : 1;
    const ratio9 = price9MonthsAgo > 0 ? currentPrice / price9MonthsAgo : 1;
    const ratio12 = price12MonthsAgo > 0 ? currentPrice / price12MonthsAgo : 1;

    return 2 * ratio3 + ratio6 + ratio9 + ratio12;
  }

  calculatePercentileRank(value: number, allValues: number[]): number {
    if (allValues.length === 0) return 0;
    const countBelow = allValues.filter((v) => v < value).length;
    const countEqual = allValues.filter((v) => v === value).length;
    return ((countBelow + 0.5 * countEqual) / allValues.length) * 100;
  }

  /**
   * 批量计算所有股票的 IBD RS 评级
   * 结果 rsRating 为 1-99 的整数，对应在当前股票池中的相对强度百分位
   */
  calculateAllRsRatings(stockPrices: IbdStockPrices[]): RsRatingResult[] {
    if (stockPrices.length === 0) return [];

    const scores = stockPrices.map((s) => ({
      stockCode: s.stockCode,
      ibdScore: this.calculateIbdScore(s),
    }));

    const allScores = scores.map((s) => s.ibdScore);
    const sorted = [...allScores].sort((a, b) => a - b);

    return scores.map((stock) => {
      const percentile = this.calculatePercentileRank(stock.ibdScore, allScores);
      const rankInUniverse = sorted.filter((v) => v <= stock.ibdScore).length;

      return {
        stockCode: stock.stockCode,
        rsRating: Math.max(1, Math.min(99, Math.round(percentile))),
        ibdScore: Math.round(stock.ibdScore * 10000) / 10000,
        rankInUniverse,
        universeSize: stockPrices.length,
      };
    });
  }
}
