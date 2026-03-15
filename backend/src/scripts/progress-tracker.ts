/**
 * 进度跟踪器
 */

import { ProgressMetrics, StockUpdateResult } from './types/optimization';

export class ProgressTracker {
  private metrics: ProgressMetrics;
  private successfulStocks: string[] = [];
  private failedStocks: string[] = [];
  private skippedStocks: string[] = [];

  constructor(total: number) {
    this.metrics = {
      total,
      completed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  }

  /**
   * 记录更新结果
   * @param result 更新结果
   */
  recordResult(result: StockUpdateResult): void {
    this.metrics.completed++;
    this.metrics.lastUpdate = Date.now();

    if (result.success) {
      this.metrics.succeeded++;
      this.successfulStocks.push(result.stockCode);
      
      if (result.reason === 'already_latest' || result.reason === 'no_new_data') {
        this.metrics.skipped++;
        this.skippedStocks.push(result.stockCode);
      }
    } else {
      this.metrics.failed++;
      this.failedStocks.push(result.stockCode);
    }

    this.updateEstimation();
  }

  /**
   * 更新时间估算
   */
  private updateEstimation(): void {
    const elapsed = Date.now() - this.metrics.startTime;
    const rate = this.metrics.completed / (elapsed / 60000); // items per minute
    this.metrics.rate = rate;

    const remaining = this.metrics.total - this.metrics.completed;
    if (rate > 0) {
      const estimatedMinutes = remaining / rate;
      this.metrics.estimatedCompletion = Date.now() + estimatedMinutes * 60000;
    }
  }

  /**
   * 获取当前指标
   */
  getMetrics(): ProgressMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取进度百分比
   */
  getProgressPercent(): number {
    if (this.metrics.total === 0) return 0;
    return Math.round((this.metrics.completed / this.metrics.total) * 100);
  }

  /**
   * 获取成功率
   */
  getSuccessRate(): number {
    if (this.metrics.completed === 0) return 0;
    return Math.round((this.metrics.succeeded / this.metrics.completed) * 100);
  }

  /**
   * 获取预计剩余时间(毫秒)
   */
  getEstimatedRemaining(): number | null {
    if (!this.metrics.estimatedCompletion) return null;
    return Math.max(0, this.metrics.estimatedCompletion - Date.now());
  }

  /**
   * 格式化时间
   * @param ms 毫秒数
   * @returns 格式化的时间字符串
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}时${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 打印进度报告
   */
  printProgress(): void {
    const percent = this.getProgressPercent();
    const elapsed = Date.now() - this.metrics.startTime;
    const remaining = this.getEstimatedRemaining();

    console.log(`\n📊 进度: ${this.metrics.completed}/${this.metrics.total} (${percent}%)`);
    console.log(`✅ 成功: ${this.metrics.succeeded} | ❌ 失败: ${this.metrics.failed} | ⏭️  跳过: ${this.metrics.skipped}`);
    console.log(`⏱️  已用时: ${this.formatTime(elapsed)}`);
    
    if (remaining !== null) {
      console.log(`⏳ 预计剩余: ${this.formatTime(remaining)}`);
    }
    
    if (this.metrics.rate) {
      console.log(`⚡ 速度: ${this.metrics.rate.toFixed(1)} 只/分钟`);
    }
  }

  /**
   * 打印最终报告
   */
  printFinalReport(): void {
    const elapsed = Date.now() - this.metrics.startTime;
    const successRate = this.getSuccessRate();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 最终报告`);
    console.log(`${'='.repeat(60)}`);
    console.log(`总计: ${this.metrics.total} 只股票`);
    console.log(`✅ 成功: ${this.metrics.succeeded} 只 (${successRate}%)`);
    console.log(`❌ 失败: ${this.metrics.failed} 只`);
    console.log(`⏭️  跳过: ${this.metrics.skipped} 只`);
    console.log(`⏱️  总用时: ${this.formatTime(elapsed)}`);
    
    if (this.metrics.rate) {
      console.log(`⚡ 平均速度: ${this.metrics.rate.toFixed(1)} 只/分钟`);
    }

    if (this.failedStocks.length > 0) {
      console.log(`\n❌ 失败的股票:`);
      this.failedStocks.slice(0, 10).forEach(code => console.log(`  - ${code}`));
      if (this.failedStocks.length > 10) {
        console.log(`  ... 及其他 ${this.failedStocks.length - 10} 只股票`);
      }
    }

    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * 获取失败的股票列表
   */
  getFailedStocks(): string[] {
    return [...this.failedStocks];
  }

  /**
   * 获取成功的股票列表
   */
  getSuccessfulStocks(): string[] {
    return [...this.successfulStocks];
  }

  /**
   * 获取跳过的股票列表
   */
  getSkippedStocks(): string[] {
    return [...this.skippedStocks];
  }
}
