/**
 * 并发控制器 - 管理API并发请求
 */

import pLimit from 'p-limit';
import { StockUpdateResult } from './types/optimization';

export interface ConcurrencyConfig {
  aStock: number;
  hkus: number;
}

export class ConcurrentFetcher {
  private aStockLimit: ReturnType<typeof pLimit>;
  private hkusLimit: ReturnType<typeof pLimit>;
  private readonly config: ConcurrencyConfig;

  constructor(config: ConcurrencyConfig = { aStock: 8, hkus: 3 }) {
    this.config = config;
    this.aStockLimit = pLimit(config.aStock);
    this.hkusLimit = pLimit(config.hkus);
  }

  /**
   * 根据市场类型获取对应的并发限制器
   * @param market 市场类型
   * @returns 并发限制器
   */
  private getLimiter(market: string): ReturnType<typeof pLimit> {
    if (market === 'SH' || market === 'SZ') {
      return this.aStockLimit;
    }
    return this.hkusLimit;
  }

  /**
   * 并发执行股票更新任务
   * @param stocks 股票列表
   * @param updateFn 更新函数
   * @param onProgress 进度回调函数
   * @returns 更新结果数组
   */
  async executeParallel<T extends { market: string }>(
    stocks: T[],
    updateFn: (stock: T) => Promise<StockUpdateResult>,
    onProgress?: (result: StockUpdateResult, completed: number, total: number) => void,
  ): Promise<StockUpdateResult[]> {
    let completed = 0;
    const total = stocks.length;
    const results: StockUpdateResult[] = [];

    const tasks = stocks.map((stock) => {
      const limiter = this.getLimiter(stock.market);

      return limiter(async () => {
        try {
          const result = await updateFn(stock);
          results.push(result);

          completed++;
          if (onProgress) {
            onProgress(result, completed, total);
          }

          return result;
        } catch (error: any) {
          const errorResult: StockUpdateResult = {
            stockCode: (stock as any).stockCode || 'unknown',
            market: stock.market,
            success: false,
            newRecords: 0,
            error: error.message,
          };
          results.push(errorResult);

          completed++;
          if (onProgress) {
            onProgress(errorResult, completed, total);
          }

          return errorResult;
        }
      });
    });

    await Promise.all(tasks);
    return results;
  }

  /**
   * 按市场类型分组并并发执行
   * @param stocks 股票列表
   * @param updateFn 更新函数
   * @param onProgress 进度回调
   * @returns 更新结果数组
   */
  async executeByMarket<T extends { market: string }>(
    stocks: T[],
    updateFn: (stock: T) => Promise<StockUpdateResult>,
    onProgress?: (result: StockUpdateResult, completed: number, total: number) => void,
  ): Promise<StockUpdateResult[]> {
    // 按市场分组
    const aStocks = stocks.filter((s) => s.market === 'SH' || s.market === 'SZ');
    const hkusStocks = stocks.filter((s) => s.market === 'HK' || s.market === 'US');

    console.log(`📊 股票分布:`);
    console.log(`  A股 (SH/SZ): ${aStocks.length} 只`);
    console.log(`  港股 (HK): ${stocks.filter((s) => s.market === 'HK').length} 只`);
    console.log(`  美股 (US): ${stocks.filter((s) => s.market === 'US').length} 只\n`);

    const allResults: StockUpdateResult[] = [];
    let totalCompleted = 0;
    const totalStocks = stocks.length;

    // 处理A股
    if (aStocks.length > 0) {
      console.log(`🚀 开始更新A股 (并发: ${this.config.aStock})\n`);

      const aResults = await this.executeParallel(
        aStocks,
        updateFn,
        (result, completed, subtotal) => {
          totalCompleted++;
          if (onProgress) {
            onProgress(result, totalCompleted, totalStocks);
          }
        },
      );

      allResults.push(...aResults);
    }

    // 处理港股和美股
    if (hkusStocks.length > 0) {
      console.log(`\n🚀 开始更新港股/美股 (并发: ${this.config.hkus})\n`);

      const hkusResults = await this.executeParallel(
        hkusStocks,
        updateFn,
        (result, completed, subtotal) => {
          totalCompleted++;
          if (onProgress) {
            onProgress(result, totalCompleted, totalStocks);
          }
        },
      );

      allResults.push(...hkusResults);
    }

    return allResults;
  }

  /**
   * 获取当前配置
   */
  getConfig(): ConcurrencyConfig {
    return { ...this.config };
  }
}
