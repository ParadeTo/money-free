/**
 * CheckpointManager单元测试
 */

import { PrismaClient } from '@prisma/client';
import { CheckpointManager } from '../../src/scripts/checkpoint-manager';

const mockPrisma = {
  importCheckpoint: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new CheckpointManager(mockPrisma);
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint data using upsert', async () => {
      const checkpointData = {
        taskId: 'task-001',
        market: 'SH',
        importType: 'incremental' as const,
        totalStocks: 100,
        importedStocks: 50,
        failedStocks: [],
        status: 'running' as const,
      };

      await manager.saveCheckpoint(checkpointData);

      expect(mockPrisma.importCheckpoint.upsert).toHaveBeenCalledWith({
        where: {
          taskId: 'task-001',
        },
        update: {
          market: 'SH',
          importType: 'incremental',
          totalStocks: 100,
          importedStocks: 50,
          failedStocks: '[]',
          status: 'running',
          lastUpdateTime: expect.any(Date),
        },
        create: {
          taskId: 'task-001',
          market: 'SH',
          importType: 'incremental',
          totalStocks: 100,
          importedStocks: 50,
          failedStocks: '[]',
          status: 'running',
          startTime: expect.any(Date),
          lastUpdateTime: expect.any(Date),
        },
      });
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint data', async () => {
      const mockRecord = {
        taskId: 'task-001',
        market: 'SH',
        importType: 'incremental',
        totalStocks: 100,
        importedStocks: 50,
        failedStocks: '[]',
        status: 'running',
      };

      (mockPrisma.importCheckpoint.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await manager.loadCheckpoint('task-001', 'SH');

      expect(result).toEqual({
        taskId: 'task-001',
        market: 'SH',
        importType: 'incremental',
        totalStocks: 100,
        importedStocks: 50,
        failedStocks: [],
        status: 'running',
      });
    });

    it('should return null if checkpoint not found', async () => {
      (mockPrisma.importCheckpoint.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await manager.loadCheckpoint('task-999', 'HK');

      expect(result).toBeNull();
    });
  });

  describe('markCompleted', () => {
    it('should update checkpoint status to completed', async () => {
      await manager.markCompleted('task-001', 'SH');

      expect(mockPrisma.importCheckpoint.update).toHaveBeenCalledWith({
        where: {
          taskId: 'task-001',
        },
        data: {
          status: 'completed',
          lastUpdateTime: expect.any(Date),
          endTime: expect.any(Date),
        },
      });
    });
  });

  describe('markFailed', () => {
    it('should update checkpoint status to failed with failed stocks', async () => {
      const failedStocks = [
        { stockCode: 'SH600000', error: 'API error', attemptCount: 3 },
      ];

      await manager.markFailed('task-001', 'SH', failedStocks);

      expect(mockPrisma.importCheckpoint.update).toHaveBeenCalledWith({
        where: {
          taskId: 'task-001',
        },
        data: {
          status: 'failed',
          failedStocks: JSON.stringify(failedStocks),
          lastUpdateTime: expect.any(Date),
          endTime: expect.any(Date),
        },
      });
    });
  });
});
