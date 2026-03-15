/**
 * ProgressTracker单元测试
 */

import { ProgressTracker } from '../../src/scripts/progress-tracker';
import { StockUpdateResult } from '../../src/scripts/types/optimization';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker(100);
  });

  describe('recordResult', () => {
    it('should update metrics on successful result', () => {
      const result: StockUpdateResult = {
        stockCode: 'SH600000',
        market: 'SH',
        success: true,
        newRecords: 10,
      };

      tracker.recordResult(result);

      const metrics = tracker.getMetrics();
      expect(metrics.completed).toBe(1);
      expect(metrics.succeeded).toBe(1);
      expect(metrics.failed).toBe(0);
    });

    it('should update metrics on failed result', () => {
      const result: StockUpdateResult = {
        stockCode: 'HK00700',
        market: 'HK',
        success: false,
        newRecords: 0,
        error: 'API error',
      };

      tracker.recordResult(result);

      const metrics = tracker.getMetrics();
      expect(metrics.completed).toBe(1);
      expect(metrics.succeeded).toBe(0);
      expect(metrics.failed).toBe(1);
    });

    it('should track skipped stocks', () => {
      const result: StockUpdateResult = {
        stockCode: 'SZ000001',
        market: 'SZ',
        success: true,
        newRecords: 0,
        reason: 'already_latest',
      };

      tracker.recordResult(result);

      const metrics = tracker.getMetrics();
      expect(metrics.succeeded).toBe(1);
      expect(metrics.skipped).toBe(1);
    });
  });

  describe('getProgressPercent', () => {
    it('should calculate progress percentage', () => {
      for (let i = 0; i < 25; i++) {
        tracker.recordResult({
          stockCode: `SH60000${i}`,
          market: 'SH',
          success: true,
          newRecords: 5,
        });
      }

      expect(tracker.getProgressPercent()).toBe(25);
    });
  });

  describe('getSuccessRate', () => {
    it('should calculate success rate', () => {
      tracker.recordResult({
        stockCode: 'SH600000',
        market: 'SH',
        success: true,
        newRecords: 5,
      });
      tracker.recordResult({
        stockCode: 'SH600001',
        market: 'SH',
        success: true,
        newRecords: 3,
      });
      tracker.recordResult({
        stockCode: 'HK00700',
        market: 'HK',
        success: false,
        newRecords: 0,
        error: 'error',
      });

      expect(tracker.getSuccessRate()).toBe(67); // 2/3 = 66.67%, rounded to 67
    });
  });

  describe('lists', () => {
    it('should track successful, failed, and skipped stocks separately', () => {
      tracker.recordResult({
        stockCode: 'SH600000',
        market: 'SH',
        success: true,
        newRecords: 10,
      });
      tracker.recordResult({
        stockCode: 'SH600001',
        market: 'SH',
        success: true,
        newRecords: 0,
        reason: 'already_latest',
      });
      tracker.recordResult({
        stockCode: 'HK00700',
        market: 'HK',
        success: false,
        newRecords: 0,
        error: 'error',
      });

      expect(tracker.getSuccessfulStocks()).toEqual(['SH600000', 'SH600001']);
      expect(tracker.getFailedStocks()).toEqual(['HK00700']);
      expect(tracker.getSkippedStocks()).toEqual(['SH600001']);
    });
  });
});
