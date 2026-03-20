/**
 * 断点续传管理器
 */

import { PrismaClient } from '@prisma/client';
import { CheckpointData, FailedStock } from './types/optimization';

export class CheckpointManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 创建或更新断点记录
   * @param data 断点数据
   */
  async saveCheckpoint(data: CheckpointData): Promise<void> {
    const now = new Date();
    await this.prisma.importCheckpoint.upsert({
      where: {
        taskId: data.taskId,
      },
      update: {
        market: data.market,
        importType: data.importType,
        totalStocks: data.totalStocks,
        importedStocks: data.importedStocks,
        failedStocks: JSON.stringify(data.failedStocks),
        status: data.status,
        lastUpdateTime: now,
      },
      create: {
        taskId: data.taskId,
        market: data.market,
        importType: data.importType,
        totalStocks: data.totalStocks,
        importedStocks: data.importedStocks,
        failedStocks: JSON.stringify(data.failedStocks),
        status: data.status,
        startTime: now,
        lastUpdateTime: now,
      },
    });
  }

  /**
   * 加载断点记录
   * @param taskId 任务ID
   * @param market 市场
   * @returns 断点数据或null
   */
  async loadCheckpoint(taskId: string, market?: string): Promise<CheckpointData | null> {
    const record = await this.prisma.importCheckpoint.findUnique({
      where: {
        taskId,
      },
    });

    if (!record) {
      return null;
    }

    return {
      taskId: record.taskId,
      market: record.market,
      importType: record.importType as 'full' | 'incremental',
      totalStocks: record.totalStocks,
      importedStocks: record.importedStocks,
      failedStocks: JSON.parse(record.failedStocks || '[]') as FailedStock[],
      status: record.status as 'running' | 'completed' | 'failed' | 'paused',
    };
  }

  /**
   * 删除断点记录
   * @param taskId 任务ID
   * @param market 市场(unused - kept for API compatibility)
   */
  async deleteCheckpoint(taskId: string, market?: string): Promise<void> {
    await this.prisma.importCheckpoint.delete({
      where: {
        taskId,
      },
    });
  }

  /**
   * 获取所有未完成的任务
   * @returns 未完成的断点数据数组
   */
  async getIncompleteCheckpoints(): Promise<CheckpointData[]> {
    const records = await this.prisma.importCheckpoint.findMany({
      where: {
        status: {
          in: ['running', 'paused', 'failed'],
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return records.map((record) => ({
      taskId: record.taskId,
      market: record.market,
      importType: record.importType as 'full' | 'incremental',
      totalStocks: record.totalStocks,
      importedStocks: record.importedStocks,
      failedStocks: JSON.parse(record.failedStocks || '[]') as FailedStock[],
      status: record.status as 'running' | 'completed' | 'failed' | 'paused',
    }));
  }

  /**
   * 标记任务为完成
   * @param taskId 任务ID
   * @param market 市场 (unused - kept for API compatibility)
   */
  async markCompleted(taskId: string, market?: string): Promise<void> {
    const now = new Date();
    await this.prisma.importCheckpoint.update({
      where: {
        taskId,
      },
      data: {
        status: 'completed',
        lastUpdateTime: now,
        endTime: now,
      },
    });
  }

  /**
   * 标记任务为失败
   * @param taskId 任务ID
   * @param market 市场 (unused - kept for API compatibility)
   * @param failedStocks 失败的股票列表
   */
  async markFailed(
    taskId: string,
    market: string | undefined,
    failedStocks: FailedStock[],
  ): Promise<void> {
    const now = new Date();
    await this.prisma.importCheckpoint.update({
      where: {
        taskId,
      },
      data: {
        status: 'failed',
        failedStocks: JSON.stringify(failedStocks),
        lastUpdateTime: now,
        endTime: now,
      },
    });
  }

  /**
   * 清理旧的已完成断点记录(保留最近N天)
   * @param daysToKeep 保留天数
   */
  async cleanupOldCheckpoints(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.importCheckpoint.deleteMany({
      where: {
        status: 'completed',
        lastUpdateTime: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
