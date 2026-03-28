import { RsRatingService, IbdStockPrices } from './rs-rating.service';

describe('RsRatingService', () => {
  let service: RsRatingService;

  beforeEach(() => {
    service = new RsRatingService();
  });

  // 辅助函数：构造仅考虑12个月涨跌的 IBD 价格对象（其他季度用当前价代替）
  function makePrices(
    stockCode: string,
    currentPrice: number,
    price12MonthsAgo: number,
    overrides: Partial<Omit<IbdStockPrices, 'stockCode' | 'currentPrice' | 'price12MonthsAgo'>> = {},
  ): IbdStockPrices {
    return {
      stockCode,
      currentPrice,
      price3MonthsAgo: overrides.price3MonthsAgo ?? currentPrice,
      price6MonthsAgo: overrides.price6MonthsAgo ?? currentPrice,
      price9MonthsAgo: overrides.price9MonthsAgo ?? currentPrice,
      price12MonthsAgo,
    };
  }

  describe('calculateIbdScore', () => {
    it('all periods flat => score = 5 (all ratios = 1, weight sum = 5)', () => {
      const prices: IbdStockPrices = {
        stockCode: 'A',
        currentPrice: 100,
        price3MonthsAgo: 100,
        price6MonthsAgo: 100,
        price9MonthsAgo: 100,
        price12MonthsAgo: 100,
      };
      expect(service.calculateIbdScore(prices)).toBeCloseTo(5);
    });

    it('recent quarter up 10%, other periods flat => score = 2*1.1 + 3*1 = 5.2', () => {
      const prices: IbdStockPrices = {
        stockCode: 'A',
        currentPrice: 110,
        price3MonthsAgo: 100,
        price6MonthsAgo: 110,
        price9MonthsAgo: 110,
        price12MonthsAgo: 110,
      };
      expect(service.calculateIbdScore(prices)).toBeCloseTo(5.2);
    });

    it('zero historical price uses ratio 1 as fallback', () => {
      const prices: IbdStockPrices = {
        stockCode: 'A',
        currentPrice: 100,
        price3MonthsAgo: 0,
        price6MonthsAgo: 0,
        price9MonthsAgo: 0,
        price12MonthsAgo: 0,
      };
      expect(service.calculateIbdScore(prices)).toBeCloseTo(5);
    });
  });

  describe('calculatePercentileRank', () => {
    it('with various distributions', () => {
      expect(
        service.calculatePercentileRank(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]),
      ).toBe(45);
    });

    it('empty array returns 0', () => {
      expect(service.calculatePercentileRank(50, [])).toBe(0);
    });

    it('all same values', () => {
      expect(service.calculatePercentileRank(10, [10, 10, 10])).toBe(50);
    });

    it('single stock', () => {
      expect(service.calculatePercentileRank(10, [10])).toBe(50);
    });

    it('value below all', () => {
      expect(service.calculatePercentileRank(5, [10, 20, 30])).toBe(0);
    });

    it('value above all', () => {
      expect(service.calculatePercentileRank(40, [10, 20, 30])).toBe(100);
    });
  });

  describe('calculateAllRsRatings', () => {
    it('higher 12-month return => higher rsRating', () => {
      const stockPrices = [
        makePrices('A', 130, 100), // +30%
        makePrices('B', 110, 100), // +10%
        makePrices('C', 150, 100), // +50%
        makePrices('D', 90, 100),  // -10%
        makePrices('E', 120, 100), // +20%
      ];
      const results = service.calculateAllRsRatings(stockPrices);
      expect(results).toHaveLength(5);
      const get = (code: string) => results.find((r) => r.stockCode === code)!.rsRating;
      expect(get('C')).toBeGreaterThan(get('A'));
      expect(get('D')).toBeLessThan(get('B'));
    });

    it('empty input returns []', () => {
      expect(service.calculateAllRsRatings([])).toEqual([]);
    });

    it('verify rankInUniverse and universeSize', () => {
      const stockPrices = [
        makePrices('A', 110, 100), // +10%
        makePrices('B', 120, 100), // +20%
        makePrices('C', 130, 100), // +30%
      ];
      const results = service.calculateAllRsRatings(stockPrices);
      expect(results[0].universeSize).toBe(3);
      expect(results[0].rankInUniverse).toBe(1);
      expect(results[1].rankInUniverse).toBe(2);
      expect(results[2].rankInUniverse).toBe(3);
    });

    it('tie-breaking: two stocks with same performance get same rsRating', () => {
      const stockPrices = [
        makePrices('A', 110, 100),
        makePrices('B', 110, 100),
      ];
      const results = service.calculateAllRsRatings(stockPrices);
      expect(results[0].rsRating).toBe(results[1].rsRating);
    });

    it('rsRating is clamped to 1-99 range', () => {
      const stockPrices = [makePrices('A', 200, 100)];
      const results = service.calculateAllRsRatings(stockPrices);
      expect(results[0].rsRating).toBeGreaterThanOrEqual(1);
      expect(results[0].rsRating).toBeLessThanOrEqual(99);
    });

    it('recent quarter outperformance weighs more than older quarters', () => {
      // stock A: only recent quarter up 20%, others flat
      const stockA: IbdStockPrices = {
        stockCode: 'A',
        currentPrice: 120,
        price3MonthsAgo: 100, // +20% recent
        price6MonthsAgo: 120,
        price9MonthsAgo: 120,
        price12MonthsAgo: 120,
      };
      // stock B: only oldest quarter up 20%, others flat
      const stockB: IbdStockPrices = {
        stockCode: 'B',
        currentPrice: 120,
        price3MonthsAgo: 120,
        price6MonthsAgo: 120,
        price9MonthsAgo: 120,
        price12MonthsAgo: 100, // +20% oldest
      };
      const scoreA = service.calculateIbdScore(stockA);
      const scoreB = service.calculateIbdScore(stockB);
      expect(scoreA).toBeGreaterThan(scoreB);
    });
  });
});
