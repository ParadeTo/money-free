/**
 * ConcurrentFetcher单元测试
 */

import { ConcurrentFetcher } from '../../src/scripts/concurrent-fetcher';
import { StockUpdateResult } from '../../src/scripts/types/optimization';

describe('ConcurrentFetcher', () => {
  let fetcher: ConcurrentFetcher;

  beforeEach(() => {
    fetcher = new ConcurrentFetcher({ aStock: 2, hkus: 1 });
  });

  describe('executeParallel', () => {
    it('should execute tasks in parallel with concurrency limits', async () => {
      const stocks = [
        { market: 'SH', stockCode: 'SH600000' },
        { market: 'SH', stockCode: 'SH600001' },
        { market: 'HK', stockCode: 'HK00700' },
      ];

      const updateFn = jest.fn(async (stock): Promise<StockUpdateResult> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          stockCode: stock.stockCode,
          market: stock.market,
          success: true,
          newRecords: 10,
        };
      });

      const results = await fetcher.executeParallel(stocks, updateFn);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(updateFn).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      const stocks = [
        { market: 'SH', stockCode: 'SH600000' },
        { market: 'HK', stockCode: 'HK00700' },
      ];

      const updateFn = jest.fn(async (stock): Promise<StockUpdateResult> => {
        if (stock.market === 'HK') {
          throw new Error('API error');
        }
        return {
          stockCode: stock.stockCode,
          market: stock.market,
          success: true,
          newRecords: 5,
        };
      });

      const results = await fetcher.executeParallel(stocks, updateFn);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('API error');
    });

    it('should call progress callback for each completed task', async () => {
      const stocks = [
        { market: 'SH', stockCode: 'SH600000' },
        { market: 'SZ', stockCode: 'SZ000001' },
      ];

      const updateFn = jest.fn(async (stock): Promise<StockUpdateResult> => ({
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 3,
      }));

      const progressFn = jest.fn();

      await fetcher.executeParallel(stocks, updateFn, progressFn);

      expect(progressFn).toHaveBeenCalledTimes(2);
      expect(progressFn).toHaveBeenCalledWith(expect.any(Object), 1, 2);
      expect(progressFn).toHaveBeenCalledWith(expect.any(Object), 2, 2);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = fetcher.getConfig();
      expect(config).toEqual({ aStock: 2, hkus: 1 });
    });
  });
});
