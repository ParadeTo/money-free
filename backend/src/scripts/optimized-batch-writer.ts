/**
 * 批量写入器 - 优化数据库写入性能
 */

import { PrismaClient } from '@prisma/client';
import { BatchWriteOptions } from './types/optimization';

export class BatchWriter<T> {
  private queue: T[] = [];
  private readonly batchSize: number;
  private readonly flushFn: (batch: T[]) => Promise<void>;
  private readonly options: BatchWriteOptions;
  private flushing: boolean = false;

  constructor(
    batchSize: number,
    flushFn: (batch: T[]) => Promise<void>,
    options: Partial<BatchWriteOptions> = {},
  ) {
    this.batchSize = batchSize;
    this.flushFn = flushFn;
    this.options = {
      batchSize,
      useTransaction: options.useTransaction ?? true,
      skipDuplicates: options.skipDuplicates ?? true,
    };
  }

  /**
   * 添加记录到队列
   * @param item 要添加的记录
   */
  async add(item: T): Promise<void> {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * 批量添加记录
   * @param items 要添加的记录数组
   */
  async addBatch(items: T[]): Promise<void> {
    this.queue.push(...items);

    while (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * 刷新队列,写入所有待处理记录
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0 || this.flushing) {
      return;
    }

    this.flushing = true;

    try {
      const batch = this.queue.splice(0, this.batchSize);
      await this.flushFn(batch);
    } finally {
      this.flushing = false;
    }
  }

  /**
   * 刷新所有剩余记录
   */
  async flushAll(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * 清空队列(不写入)
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * 创建K线数据批量写入器
 * @param prisma Prisma客户端
 * @param batchSize 批次大小
 * @returns BatchWriter实例
 */
export function createKLineWriter(prisma: PrismaClient, batchSize: number = 100): BatchWriter<any> {
  return new BatchWriter(batchSize, async (batch) => {
    await prisma.$transaction(async (tx) => {
      await tx.kLineData.createMany({
        data: batch,
      });
    });
  });
}

/**
 * 创建技术指标批量写入器
 * @param prisma Prisma客户端
 * @param batchSize 批次大小
 * @returns BatchWriter实例
 */
export function createIndicatorWriter(
  prisma: PrismaClient,
  batchSize: number = 100,
): BatchWriter<any> {
  return new BatchWriter(batchSize, async (batch) => {
    await prisma.$transaction(async (tx) => {
      await tx.technicalIndicator.createMany({
        data: batch,
      });
    });
  });
}
