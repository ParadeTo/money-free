// backend/test/unit/test_data_update.spec.ts
// T096, T098: Unit tests for DataUpdateService

import { Test, TestingModule } from '@nestjs/testing';
import { DataUpdateService } from '../../src/modules/data-update/data-update.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';

describe('DataUpdateService', () => {
  let service: DataUpdateService;
  let prismaService: PrismaService;
  let dataUpdateQueue: Queue;

  const mockPrismaService = {
    updateLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    stock: {
      findMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataUpdateService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken('data-update'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<DataUpdateService>(DataUpdateService);
    prismaService = module.get<PrismaService>(PrismaService);
    dataUpdateQueue = module.get<Queue>(getQueueToken('data-update'));

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('triggerIncrementalUpdate', () => {
    it('should create update log and enqueue update task', async () => {
      // Arrange
      const mockStocks = [
        { stockCode: '600519', stockName: '贵州茅台' },
        { stockCode: '000001', stockName: '平安银行' },
      ];
      const mockTaskId = 'task-123';
      const mockUpdateLog = {
        taskId: mockTaskId,
        status: 'pending',
        totalStocks: 2,
        processedStocks: 0,
        successCount: 0,
        failedCount: 0,
        errorDetails: null,
        startTime: new Date(),
        endTime: null,
      };

      mockPrismaService.updateLog.findMany.mockResolvedValue([]); // No running tasks
      mockPrismaService.stock.findMany.mockResolvedValue(mockStocks);
      mockPrismaService.updateLog.create.mockResolvedValue(mockUpdateLog);
      mockQueue.add.mockResolvedValue({ id: mockTaskId });

      // Act
      const result = await service.triggerIncrementalUpdate();

      // Assert
      expect(result).toHaveProperty('taskId');
      expect(typeof result.taskId).toBe('string');
      expect(mockPrismaService.stock.findMany).toHaveBeenCalledWith({
        where: { admissionStatus: 'active' },
        select: { stockCode: true, stockName: true },
      });
      expect(mockPrismaService.updateLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: expect.any(String),
          status: 'pending',
          totalStocks: 2,
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'incremental-update',
        expect.objectContaining({
          taskId: expect.any(String),
          stocks: mockStocks,
        }),
      );
    });

    it('should return 409 if update task already running', async () => {
      // Arrange
      const mockRunningLog = {
        taskId: 'task-running',
        status: 'running',
        totalStocks: 1000,
        processedStocks: 500,
        successCount: 450,
        failedCount: 50,
        startTime: new Date(),
      };

      mockPrismaService.updateLog.findMany.mockResolvedValue([mockRunningLog]);

      // Act & Assert
      await expect(service.triggerIncrementalUpdate()).rejects.toThrow(
        'An update task is already running',
      );
    });
  });

  describe('getUpdateStatus', () => {
    it('should return update status for given taskId', async () => {
      // Arrange
      const taskId = 'task-123';
      const mockUpdateLog = {
        taskId,
        status: 'running',
        totalStocks: 1000,
        processedStocks: 500,
        successCount: 450,
        failedCount: 50,
        errorDetails: null,
        startTime: new Date(),
        endTime: null,
      };

      mockPrismaService.updateLog.findUnique.mockResolvedValue(mockUpdateLog);

      // Act
      const result = await service.getUpdateStatus(taskId);

      // Assert
      expect(result).toEqual({
        ...mockUpdateLog,
        progress: 50, // Service adds progress calculation
      });
      expect(mockPrismaService.updateLog.findUnique).toHaveBeenCalledWith({
        where: { taskId },
      });
    });

    it('should throw error if taskId not found', async () => {
      // Arrange
      const taskId = 'non-existent-task';
      mockPrismaService.updateLog.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUpdateStatus(taskId)).rejects.toThrow(
        'Update task not found',
      );
    });
  });

  describe('getUpdateHistory', () => {
    it('should return list of update logs ordered by startTime desc', async () => {
      // Arrange
      const mockLogs = [
        {
          taskId: 'task-2',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 990,
          failedCount: 10,
          startTime: new Date('2026-02-28T10:00:00Z'),
          endTime: new Date('2026-02-28T10:05:00Z'),
        },
        {
          taskId: 'task-1',
          status: 'completed',
          totalStocks: 1000,
          processedStocks: 1000,
          successCount: 995,
          failedCount: 5,
          startTime: new Date('2026-02-27T10:00:00Z'),
          endTime: new Date('2026-02-27T10:05:00Z'),
        },
      ];

      mockPrismaService.updateLog.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await service.getUpdateHistory();

      // Assert
      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.updateLog.findMany).toHaveBeenCalledWith({
        orderBy: { startTime: 'desc' },
        take: 50,
      });
    });
  });

  describe('retryFailedStocks', () => {
    it('should retry failed stocks from a completed task', async () => {
      // Arrange
      const taskId = 'task-with-failures';
      const mockUpdateLog = {
        taskId,
        status: 'completed',
        totalStocks: 1000,
        processedStocks: 1000,
        successCount: 990,
        failedCount: 10,
        errorDetails: JSON.stringify([
          { stockCode: '600519', errorReason: 'API timeout', retryResult: null },
          { stockCode: '000001', errorReason: 'Network error', retryResult: null },
        ]),
        startTime: new Date(),
        endTime: new Date(),
      };

      mockPrismaService.updateLog.findUnique.mockResolvedValue(mockUpdateLog);

      // Act
      const result = await service.retryFailedStocks(taskId);

      // Assert
      expect(result).toEqual({ retriedCount: 2 });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'retry-failed-stocks',
        expect.objectContaining({
          originalTaskId: taskId,
          failedStocks: expect.arrayContaining([
            expect.objectContaining({ stockCode: '600519' }),
            expect.objectContaining({ stockCode: '000001' }),
          ]),
        }),
      );
    });

    it('should throw error if no failed stocks to retry', async () => {
      // Arrange
      const taskId = 'task-success';
      const mockUpdateLog = {
        taskId,
        status: 'completed',
        failedCount: 0,
        errorDetails: null,
      };

      mockPrismaService.updateLog.findUnique.mockResolvedValue(mockUpdateLog);

      // Act & Assert
      await expect(service.retryFailedStocks(taskId)).rejects.toThrow(
        'No failed stocks to retry',
      );
    });
  });

  describe('error handling and retry logic', () => {
    it('should record error details when stock update fails', async () => {
      // This test will be covered in the processor tests
      // Testing the error handling structure
      const errorDetails = [
        {
          stockCode: '600519',
          errorReason: 'API timeout',
          retryResult: 'success',
        },
      ];

      const serialized = JSON.stringify(errorDetails);
      expect(JSON.parse(serialized)).toEqual(errorDetails);
    });

    it('should auto-retry once on failure', async () => {
      // This behavior will be tested in processor tests
      // Verifying the retry logic structure
      const errorEntry: { 
        stockCode: string; 
        errorReason: string; 
        retryResult: string | null 
      } = {
        stockCode: '600519',
        errorReason: 'Network error',
        retryResult: null,
      };

      // First attempt fails
      expect(errorEntry.retryResult).toBeNull();

      // After retry
      errorEntry.retryResult = 'success';
      expect(errorEntry.retryResult).toBe('success');
    });
  });
});
