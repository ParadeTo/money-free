/**
 * 并发控制性能测试
 */

import { ConcurrentFetcher } from '../../src/scripts/concurrent-fetcher';

describe('Concurrency Performance Test', () => {
  it('should respect A-share concurrency limit of 8', async () => {
    const fetcher = new ConcurrentFetcher({ aStock: 8, hkus: 3 });
    
    let maxConcurrent = 0;
    let currentConcurrent = 0;
    
    const stocks = Array.from({ length: 100 }, (_, i) => ({
      market: 'SH',
      stockCode: `SH6000${i.toString().padStart(2, '0')}`,
    }));

    const updateFn = async (stock: any) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      currentConcurrent--;
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 5,
      };
    };

    await fetcher.executeParallel(stocks, updateFn);

    expect(maxConcurrent).toBeLessThanOrEqual(8);
    expect(maxConcurrent).toBeGreaterThan(1); // Verify it's actually concurrent
  }, 30000);

  it('should respect HK/US concurrency limit of 3', async () => {
    const fetcher = new ConcurrentFetcher({ aStock: 8, hkus: 3 });
    
    let maxConcurrent = 0;
    let currentConcurrent = 0;
    
    const stocks = Array.from({ length: 50 }, (_, i) => ({
      market: 'HK',
      stockCode: `HK${i.toString().padStart(5, '0')}`,
    }));

    const updateFn = async (stock: any) => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      currentConcurrent--;
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 3,
      };
    };

    await fetcher.executeParallel(stocks, updateFn);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  }, 30000);
});
