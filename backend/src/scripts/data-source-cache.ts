/**
 * 数据源健康状态缓存和切换管理器
 */

import { DataSourceStatus, DataSourceType } from './types/optimization';

export class DataSourceCache {
  private statusCache: Map<DataSourceType, DataSourceStatus> = new Map();
  private readonly failureThreshold: number;
  private readonly checkInterval: number; // milliseconds

  constructor(failureThreshold: number = 3, checkIntervalMs: number = 300000) {
    this.failureThreshold = failureThreshold;
    this.checkInterval = checkIntervalMs;

    // 初始化所有数据源为可用
    const sources: DataSourceType[] = ['tushare', 'akshare', 'yahoo_finance'];
    sources.forEach((source) => {
      this.statusCache.set(source, {
        isAvailable: true,
        lastCheckTime: Date.now(),
        consecutiveFailures: 0,
      });
    });
  }

  /**
   * 记录数据源调用成功
   * @param source 数据源类型
   */
  recordSuccess(source: DataSourceType): void {
    const status = this.statusCache.get(source);
    if (status) {
      status.consecutiveFailures = 0;
      status.isAvailable = true;
      status.lastCheckTime = Date.now();
      status.lastError = undefined;
    }
  }

  /**
   * 记录数据源调用失败
   * @param source 数据源类型
   * @param error 错误消息
   */
  recordFailure(source: DataSourceType, error: string): void {
    const status = this.statusCache.get(source);
    if (status) {
      status.consecutiveFailures++;
      status.lastCheckTime = Date.now();
      status.lastError = error;

      if (status.consecutiveFailures >= this.failureThreshold) {
        status.isAvailable = false;
        console.warn(
          `⚠️ 数据源 ${source} 连续失败 ${status.consecutiveFailures} 次,标记为不可用`,
        );
      }
    }
  }

  /**
   * 获取数据源状态
   * @param source 数据源类型
   * @returns 数据源状态
   */
  getStatus(source: DataSourceType): DataSourceStatus {
    const status = this.statusCache.get(source);
    if (!status) {
      return {
        isAvailable: false,
        lastCheckTime: 0,
        consecutiveFailures: 0,
      };
    }
    return { ...status };
  }

  /**
   * 检查数据源是否可用
   * @param source 数据源类型
   * @returns 是否可用
   */
  isAvailable(source: DataSourceType): boolean {
    const status = this.statusCache.get(source);
    if (!status) return false;

    // 如果标记为不可用,检查是否需要重新尝试
    if (!status.isAvailable) {
      const timeSinceLastCheck = Date.now() - status.lastCheckTime;
      if (timeSinceLastCheck > this.checkInterval) {
        console.log(`🔄 数据源 ${source} 冷却时间已过,尝试恢复...`);
        status.consecutiveFailures = 0;
        status.isAvailable = true;
      }
    }

    return status.isAvailable;
  }

  /**
   * 获取首选数据源(按优先级和可用性)
   * @param preferredSource 优先选择的数据源
   * @param fallbackSource 备用数据源
   * @returns 可用的数据源
   */
  getAvailableSource(
    preferredSource: DataSourceType,
    fallbackSource: DataSourceType,
  ): DataSourceType | null {
    if (this.isAvailable(preferredSource)) {
      return preferredSource;
    }

    if (this.isAvailable(fallbackSource)) {
      console.log(`⚠️ 主数据源 ${preferredSource} 不可用,切换到 ${fallbackSource}`);
      return fallbackSource;
    }

    console.error(`❌ 主备数据源均不可用: ${preferredSource}, ${fallbackSource}`);
    return null;
  }

  /**
   * 获取所有数据源状态
   * @returns 数据源状态映射
   */
  getAllStatus(): Map<DataSourceType, DataSourceStatus> {
    return new Map(this.statusCache);
  }

  /**
   * 打印数据源健康报告
   */
  printHealthReport(): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📡 数据源健康状态`);
    console.log(`${'='.repeat(60)}`);

    this.statusCache.forEach((status, source) => {
      const icon = status.isAvailable ? '✅' : '❌';
      const timeSinceCheck = Date.now() - status.lastCheckTime;
      const minutesAgo = Math.floor(timeSinceCheck / 60000);

      console.log(`${icon} ${source}:`);
      console.log(`   状态: ${status.isAvailable ? '可用' : '不可用'}`);
      console.log(`   连续失败: ${status.consecutiveFailures} 次`);
      console.log(`   最后检查: ${minutesAgo} 分钟前`);
      if (status.lastError) {
        console.log(`   最后错误: ${status.lastError}`);
      }
    });

    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * 重置所有数据源状态
   */
  resetAll(): void {
    this.statusCache.forEach((status) => {
      status.isAvailable = true;
      status.consecutiveFailures = 0;
      status.lastCheckTime = Date.now();
      status.lastError = undefined;
    });
  }

  /**
   * 强制标记数据源为可用
   * @param source 数据源类型
   */
  forceAvailable(source: DataSourceType): void {
    const status = this.statusCache.get(source);
    if (status) {
      status.isAvailable = true;
      status.consecutiveFailures = 0;
      status.lastCheckTime = Date.now();
      status.lastError = undefined;
    }
  }
}
