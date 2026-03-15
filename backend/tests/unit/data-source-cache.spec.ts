/**
 * DataSourceCache单元测试
 */

import { DataSourceCache } from '../../src/scripts/data-source-cache';

describe('DataSourceCache', () => {
  let cache: DataSourceCache;

  beforeEach(() => {
    cache = new DataSourceCache(3, 1000); // 3 failures, 1s cooldown
  });

  describe('recordSuccess', () => {
    it('should reset failure count and mark as available', () => {
      cache.recordFailure('tushare', 'error 1');
      cache.recordFailure('tushare', 'error 2');
      cache.recordSuccess('tushare');

      const status = cache.getStatus('tushare');
      expect(status.consecutiveFailures).toBe(0);
      expect(status.isAvailable).toBe(true);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      cache.recordFailure('akshare', 'error');

      const status = cache.getStatus('akshare');
      expect(status.consecutiveFailures).toBe(1);
      expect(status.lastError).toBe('error');
    });

    it('should mark as unavailable after threshold failures', () => {
      cache.recordFailure('tushare', 'error 1');
      cache.recordFailure('tushare', 'error 2');
      
      expect(cache.isAvailable('tushare')).toBe(true);
      
      cache.recordFailure('tushare', 'error 3');
      
      expect(cache.isAvailable('tushare')).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true for newly initialized sources', () => {
      expect(cache.isAvailable('tushare')).toBe(true);
      expect(cache.isAvailable('akshare')).toBe(true);
      expect(cache.isAvailable('yahoo_finance')).toBe(true);
    });

    it('should allow retry after cooldown period', async () => {
      // Mark as unavailable
      cache.recordFailure('yahoo_finance', 'e1');
      cache.recordFailure('yahoo_finance', 'e2');
      cache.recordFailure('yahoo_finance', 'e3');
      
      expect(cache.isAvailable('yahoo_finance')).toBe(false);

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should auto-recover
      expect(cache.isAvailable('yahoo_finance')).toBe(true);
    });
  });

  describe('getAvailableSource', () => {
    it('should return preferred source if available', () => {
      const source = cache.getAvailableSource('tushare', 'akshare');
      expect(source).toBe('tushare');
    });

    it('should return fallback if preferred is unavailable', () => {
      cache.recordFailure('tushare', 'e1');
      cache.recordFailure('tushare', 'e2');
      cache.recordFailure('tushare', 'e3');

      const source = cache.getAvailableSource('tushare', 'akshare');
      expect(source).toBe('akshare');
    });

    it('should return null if both sources unavailable', () => {
      ['tushare', 'akshare'].forEach(src => {
        cache.recordFailure(src as any, 'e1');
        cache.recordFailure(src as any, 'e2');
        cache.recordFailure(src as any, 'e3');
      });

      const source = cache.getAvailableSource('tushare', 'akshare');
      expect(source).toBeNull();
    });
  });

  describe('resetAll', () => {
    it('should reset all data sources to available', () => {
      cache.recordFailure('tushare', 'e1');
      cache.recordFailure('tushare', 'e2');
      cache.recordFailure('tushare', 'e3');

      cache.resetAll();

      expect(cache.isAvailable('tushare')).toBe(true);
      const status = cache.getStatus('tushare');
      expect(status.consecutiveFailures).toBe(0);
    });
  });
});
