import { RsRatingService } from './rs-rating.service';

describe('RsRatingService', () => {
  let service: RsRatingService;

  beforeEach(() => {
    service = new RsRatingService();
  });

  describe('calculateOneYearReturn', () => {
    it('normal case: 110/100 - 1 = 0.1', () => {
      expect(service.calculateOneYearReturn(110, 100)).toBeCloseTo(0.1);
    });

    it('zero closeOneYearAgo returns 0', () => {
      expect(service.calculateOneYearReturn(110, 0)).toBe(0);
    });

    it('negative return', () => {
      expect(service.calculateOneYearReturn(90, 100)).toBeCloseTo(-0.1);
    });
  });

  describe('calculatePercentileRank', () => {
    it('with various distributions', () => {
      expect(service.calculatePercentileRank(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBe(45);
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
    it('normal batch with 5 stocks', () => {
      const stockReturns = [
        { stockCode: 'A', oneYearReturn: 0.3 },
        { stockCode: 'B', oneYearReturn: 0.1 },
        { stockCode: 'C', oneYearReturn: 0.5 },
        { stockCode: 'D', oneYearReturn: -0.1 },
        { stockCode: 'E', oneYearReturn: 0.2 },
      ];
      const results = service.calculateAllRsRatings(stockReturns);
      expect(results).toHaveLength(5);
      expect(results.find(r => r.stockCode === 'C')?.rsRating).toBeGreaterThan(results.find(r => r.stockCode === 'A')?.rsRating ?? 0);
      expect(results.find(r => r.stockCode === 'D')?.rsRating).toBeLessThan(results.find(r => r.stockCode === 'B')?.rsRating ?? 0);
      results.forEach(r => {
        expect(r.universeSize).toBe(5);
        expect(r.rankInUniverse).toBeGreaterThanOrEqual(1);
        expect(r.rankInUniverse).toBeLessThanOrEqual(5);
      });
    });

    it('empty input returns []', () => {
      expect(service.calculateAllRsRatings([])).toEqual([]);
    });

    it('verify rankInUniverse and universeSize', () => {
      const stockReturns = [
        { stockCode: 'A', oneYearReturn: 0.1 },
        { stockCode: 'B', oneYearReturn: 0.2 },
        { stockCode: 'C', oneYearReturn: 0.3 },
      ];
      const results = service.calculateAllRsRatings(stockReturns);
      expect(results[0].universeSize).toBe(3);
      expect(results[0].rankInUniverse).toBe(1);
      expect(results[1].rankInUniverse).toBe(2);
      expect(results[2].rankInUniverse).toBe(3);
    });

    it('tie-breaking: two stocks with same return get same rsRating', () => {
      const stockReturns = [
        { stockCode: 'A', oneYearReturn: 0.1 },
        { stockCode: 'B', oneYearReturn: 0.1 },
      ];
      const results = service.calculateAllRsRatings(stockReturns);
      expect(results[0].rsRating).toBe(results[1].rsRating);
      expect(results[0].rsRating).toBe(50);
    });
  });
});
