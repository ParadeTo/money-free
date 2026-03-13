/**
 * 导入检查点追踪器
 * 支持导入任务的断点续传
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface CheckpointData {
  taskId: string;
  market: 'HK' | 'US';
  importType: 'full' | 'incremental' | 'index_update';
  totalStocks: number;
  importedStocks: number;
  failedStocks: Array<{ stockCode: string; error: string }>;
  status: 'running' | 'completed' | 'failed' | 'paused';
}

@Injectable()
export class CheckpointTracker {
  private readonly logger: Logger;

  constructor(private readonly prisma: PrismaClient) {
    this.logger = new Logger(CheckpointTracker.name);
  }

  async createCheckpoint(
    taskId: string,
    market: 'HK' | 'US',
    importType: 'full' | 'incremental' | 'index_update',
    totalStocks: number,
  ): Promise<CheckpointData> {
    this.logger.log(`Creating checkpoint for task ${taskId}`);

    const checkpoint = await this.prisma.importCheckpoint.create({
      data: {
        taskId,
        market,
        importType,
        totalStocks,
        importedStocks: 0,
        failedStocks: JSON.stringify([]),
        status: 'running',
        startTime: new Date(),
        lastUpdateTime: new Date(),
      },
    });

    return this.toCheckpointData(checkpoint);
  }

  async getCheckpoint(taskId: string): Promise<CheckpointData | null> {
    const checkpoint = await this.prisma.importCheckpoint.findUnique({
      where: { taskId },
    });

    return checkpoint ? this.toCheckpointData(checkpoint) : null;
  }

  async updateProgress(
    taskId: string,
    importedStocks: number,
  ): Promise<void> {
    await this.prisma.importCheckpoint.update({
      where: { taskId },
      data: {
        importedStocks,
        lastUpdateTime: new Date(),
      },
    });
  }

  async recordFailure(
    taskId: string,
    stockCode: string,
    error: string,
  ): Promise<void> {
    const checkpoint = await this.prisma.importCheckpoint.findUnique({
      where: { taskId },
    });

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${taskId}`);
    }

    const failedStocks = JSON.parse(checkpoint.failedStocks || '[]');
    failedStocks.push({ stockCode, error });

    await this.prisma.importCheckpoint.update({
      where: { taskId },
      data: {
        failedStocks: JSON.stringify(failedStocks),
        lastUpdateTime: new Date(),
      },
    });
  }

  async completeCheckpoint(taskId: string): Promise<void> {
    this.logger.log(`Completing checkpoint for task ${taskId}`);

    await this.prisma.importCheckpoint.update({
      where: { taskId },
      data: {
        status: 'completed',
        endTime: new Date(),
        lastUpdateTime: new Date(),
      },
    });
  }

  async failCheckpoint(taskId: string, reason?: string): Promise<void> {
    this.logger.error(`Failing checkpoint for task ${taskId}: ${reason}`);

    await this.prisma.importCheckpoint.update({
      where: { taskId },
      data: {
        status: 'failed',
        endTime: new Date(),
        lastUpdateTime: new Date(),
      },
    });
  }

  async pauseCheckpoint(taskId: string): Promise<void> {
    this.logger.log(`Pausing checkpoint for task ${taskId}`);

    await this.prisma.importCheckpoint.update({
      where: { taskId },
      data: {
        status: 'paused',
        lastUpdateTime: new Date(),
      },
    });
  }

  async resumeCheckpoint(taskId: string): Promise<CheckpointData> {
    this.logger.log(`Resuming checkpoint for task ${taskId}`);

    const checkpoint = await this.prisma.importCheckpoint.update({
      where: { taskId },
      data: {
        status: 'running',
        lastUpdateTime: new Date(),
      },
    });

    return this.toCheckpointData(checkpoint);
  }

  async getImportedStocks(taskId: string): Promise<string[]> {
    const checkpoint = await this.prisma.importCheckpoint.findUnique({
      where: { taskId },
    });

    if (!checkpoint) {
      return [];
    }

    const market = checkpoint.market as 'HK' | 'US';
    const stocks = await this.prisma.stock.findMany({
      where: { market },
      select: { stockCode: true },
    });

    return stocks.map((s) => s.stockCode);
  }

  async listActiveCheckpoints(): Promise<CheckpointData[]> {
    const checkpoints = await this.prisma.importCheckpoint.findMany({
      where: {
        status: {
          in: ['running', 'paused'],
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return checkpoints.map((c) => this.toCheckpointData(c));
  }

  private toCheckpointData(checkpoint: any): CheckpointData {
    return {
      taskId: checkpoint.taskId,
      market: checkpoint.market,
      importType: checkpoint.importType,
      totalStocks: checkpoint.totalStocks,
      importedStocks: checkpoint.importedStocks,
      failedStocks: JSON.parse(checkpoint.failedStocks || '[]'),
      status: checkpoint.status,
    };
  }
}
