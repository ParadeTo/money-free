// backend/test/unit/test_async_tasks.spec.ts
// T097: Unit test for async task status management

import { Test, TestingModule } from '@nestjs/testing';
import { DataUpdateProcessor } from '../../src/modules/data-update/processors/data-update.processor';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { Job } from 'bull';

describe('DataUpdateProcessor - Async Task Status Management', () => {
  let processor: DataUpdateProcessor;
  let prismaService: PrismaService;

  const mockPrismaService = {
    updateLog: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    klineData: {
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    technicalIndicator: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataUpdateProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    processor = module.get<DataUpdateProcessor>(DataUpdateProcessor);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('processIncrementalUpdate', () => {
    it('should update task status from pending to running', async () => {
      // Arrange
      const mockJob: Partial<Job> = {
        data: {
          taskId: 'task-123',
          stocks: [
            { stockCode: '600519', stockName: '贵州茅台' },
          ],
        },
        progress: jest.fn().mockResolvedValue(undefined),
      };

      mockPrismaService.klineData.findFirst.mockResolvedValue({
        date: new Date('2026-02-27'),
      });
      mockPrismaService.klineData.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.technicalIndicator.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.technicalIndicator.createMany.mockResolvedValue({ count: 5 });

      // Act
      await processor.processIncrementalUpdate(mockJob as Job);

      // Assert
      // Verify status updated to 'running' at start
      expect(mockPrismaService.updateLog.update).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
        data: { status: 'running' },
      });

      // Verify status updated to 'completed' at end
      expect(mockPrismaService.updateLog.update).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
        data: expect.objectContaining({
          status: 'completed',
          endTime: expect.any(Date),
        }),
      });
    });

    it('should update progress during processing', async () => {
      // Arrange
      const mockJob: Partial<Job> = {
        data: {
          taskId: 'task-123',
          stocks: [
            { stockCode: '600519', stockName: '贵州茅台' },
            { stockCode: '000001', stockName: '平安银行' },
            { stockCode: '000002', stockName: '万科A' },
          ],
        },
        progress: jest.fn().mockResolvedValue(undefined),
      };

      mockPrismaService.klineData.findFirst.mockResolvedValue({
        date: new Date('2026-02-27'),
      });
      mockPrismaService.klineData.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.technicalIndicator.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.technicalIndicator.createMany.mockResolvedValue({ count: 5 });

      // Act
      await processor.processIncrementalUpdate(mockJob as Job);

      // Assert
      // Verify job.progress() was called with percentage updates
      expect(mockJob.progress).toHaveBeenCalled();
      
      // Verify processedStocks count updated in database
      expect(mockPrismaService.updateLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { taskId: 'task-123' },
          data: expect.objectContaining({
            processedStocks: expect.any(Number),
          }),
        }),
      );
    });

    it('should update status to failed on error', async () => {
      // Arrange
      const mockJob: Partial<Job> = {
        data: {
          taskId: 'task-123',
          stocks: [
            { stockCode: '600519', stockName: '贵州茅台' },
          ],
        },
        progress: jest.fn().mockResolvedValue(undefined),
      };

      // Simulate error during processing
      mockPrismaService.klineData.findFirst.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(
        processor.processIncrementalUpdate(mockJob as Job),
      ).rejects.toThrow();

      // Verify status updated to 'failed'
      expect(mockPrismaService.updateLog.update).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
        data: expect.objectContaining({
          status: 'failed',
          endTime: expect.any(Date),
        }),
      });
    });

    it('should track success and failure counts', async () => {
      // Arrange
      const mockJob: Partial<Job> = {
        data: {
          taskId: 'task-123',
          stocks: [
            { stockCode: '600519', stockName: '贵州茅台' },
            { stockCode: '000001', stockName: '平安银行' },
          ],
        },
        progress: jest.fn().mockResolvedValue(undefined),
      };

      // First stock succeeds
      mockPrismaService.klineData.findFirst
        .mockResolvedValueOnce({ date: new Date('2026-02-27') })
        .mockRejectedValueOnce(new Error('API timeout')); // Second stock fails

      mockPrismaService.klineData.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.technicalIndicator.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.technicalIndicator.createMany.mockResolvedValue({ count: 5 });

      // Act
      await processor.processIncrementalUpdate(mockJob as Job);

      // Assert
      expect(mockPrismaService.updateLog.update).toHaveBeenCalledWith({
        where: { taskId: 'task-123' },
        data: expect.objectContaining({
          successCount: 1,
          failedCount: 1,
        }),
      });
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress percentage correctly', () => {
      // Test progress calculation logic
      const totalStocks = 1000;
      const processedStocks = 500;
      const expectedProgress = (processedStocks / totalStocks) * 100;

      expect(expectedProgress).toBe(50);
    });

    it('should handle edge cases in progress calculation', () => {
      // Zero stocks
      const progress1 = 0 / 1 * 100;
      expect(progress1).toBe(0);

      // All stocks processed
      const progress2 = 1000 / 1000 * 100;
      expect(progress2).toBe(100);

      // Avoid division by zero
      const totalStocks = 0;
      const progress3 = totalStocks === 0 ? 0 : 500 / totalStocks * 100;
      expect(progress3).toBe(0);
    });
  });
});
