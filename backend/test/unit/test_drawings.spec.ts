// backend/test/unit/test_drawings.spec.ts
// T205: Unit tests for DrawingsService

import { Test, TestingModule } from '@nestjs/testing';
import { DrawingsService } from '../../src/modules/drawings/drawings.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DrawingsService', () => {
  let service: DrawingsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    drawing: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DrawingsService>(DrawingsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a trend line drawing with valid coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'trend_line' as const,
        coordinates: JSON.stringify([
          { x: '2026-01-01', y: 10.5 },
          { x: '2026-02-01', y: 12.3 },
        ]),
      };

      const mockDrawing = {
        drawingId: 'drawing-123',
        ...createDrawingDto,
        userId,
        stylePreset: 'default',
        createdAt: new Date(),
      };

      mockPrismaService.drawing.create.mockResolvedValue(mockDrawing);

      // Act
      const result = await service.create(userId, createDrawingDto);

      // Assert
      expect(result).toEqual(mockDrawing);
      expect(mockPrismaService.drawing.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          drawingId: expect.any(String),
          userId,
          stockCode: createDrawingDto.stockCode,
          period: createDrawingDto.period,
          drawingType: createDrawingDto.drawingType,
          coordinates: createDrawingDto.coordinates,
          stylePreset: 'default',
        }),
      });
    });

    it('should create a horizontal line drawing with valid coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'horizontal_line' as const,
        coordinates: JSON.stringify([{ y: 10.5 }]),
      };

      const mockDrawing = {
        drawingId: 'drawing-124',
        ...createDrawingDto,
        userId,
        stylePreset: 'default',
        createdAt: new Date(),
      };

      mockPrismaService.drawing.create.mockResolvedValue(mockDrawing);

      // Act
      const result = await service.create(userId, createDrawingDto);

      // Assert
      expect(result).toEqual(mockDrawing);
    });

    it('should throw BadRequestException for invalid trend_line coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'trend_line' as const,
        coordinates: JSON.stringify([{ x: '2026-01-01', y: 10.5 }]), // Only 1 point, needs 2
      };

      // Act & Assert
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        'trend_line requires exactly 2 points',
      );
    });

    it('should throw BadRequestException for invalid horizontal_line coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'horizontal_line' as const,
        coordinates: JSON.stringify([]), // Empty array
      };

      // Act & Assert
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        'horizontal_line requires exactly 1 point with y coordinate',
      );
    });

    it('should throw BadRequestException for invalid rectangle coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'rectangle' as const,
        coordinates: JSON.stringify([
          { x1: '2026-01-01', y1: 10.5 },
        ]), // Missing x2, y2
      };

      // Act & Assert
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for malformed JSON coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'trend_line' as const,
        coordinates: 'invalid-json',
      };

      // Act & Assert
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByStockAndPeriod', () => {
    it('should return all drawings for a stock and period', async () => {
      // Arrange
      const userId = 'user-123';
      const stockCode = '600519';
      const period = 'daily';

      const mockDrawings = [
        {
          drawingId: 'drawing-1',
          userId,
          stockCode,
          period,
          drawingType: 'trend_line',
          coordinates: JSON.stringify([
            { x: '2026-01-01', y: 10.5 },
            { x: '2026-02-01', y: 12.3 },
          ]),
          stylePreset: 'default',
          createdAt: new Date(),
        },
        {
          drawingId: 'drawing-2',
          userId,
          stockCode,
          period,
          drawingType: 'horizontal_line',
          coordinates: JSON.stringify([{ y: 11.0 }]),
          stylePreset: 'default',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.drawing.findMany.mockResolvedValue(mockDrawings);

      // Act
      const result = await service.findByStockAndPeriod(
        userId,
        stockCode,
        period,
      );

      // Assert
      expect(result).toEqual(mockDrawings);
      expect(mockPrismaService.drawing.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          stockCode,
          period,
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array if no drawings found', async () => {
      // Arrange
      const userId = 'user-123';
      const stockCode = '600519';
      const period = 'daily';

      mockPrismaService.drawing.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findByStockAndPeriod(
        userId,
        stockCode,
        period,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should delete a drawing successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const drawingId = 'drawing-123';

      const mockDrawing = {
        drawingId,
        userId,
        stockCode: '600519',
        period: 'daily',
        drawingType: 'trend_line',
        coordinates: '[]',
        stylePreset: 'default',
        createdAt: new Date(),
      };

      mockPrismaService.drawing.delete.mockResolvedValue(mockDrawing);

      // Act
      await service.remove(userId, drawingId);

      // Assert
      expect(mockPrismaService.drawing.delete).toHaveBeenCalledWith({
        where: {
          drawingId,
          userId, // Ensure user can only delete their own drawings
        },
      });
    });

    it('should throw NotFoundException if drawing not found', async () => {
      // Arrange
      const userId = 'user-123';
      const drawingId = 'non-existent';

      mockPrismaService.drawing.delete.mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      });

      // Act & Assert
      await expect(service.remove(userId, drawingId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not allow deleting drawings from other users', async () => {
      // Arrange
      const userId = 'user-123';
      const drawingId = 'drawing-456'; // Belongs to another user

      mockPrismaService.drawing.delete.mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      });

      // Act & Assert
      await expect(service.remove(userId, drawingId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateCoordinates', () => {
    it('should validate vertical_line coordinates correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'vertical_line' as const,
        coordinates: JSON.stringify([{ x: '2026-01-15' }]),
      };

      const mockDrawing = {
        drawingId: 'drawing-125',
        ...createDrawingDto,
        userId,
        stylePreset: 'default',
        createdAt: new Date(),
      };

      mockPrismaService.drawing.create.mockResolvedValue(mockDrawing);

      // Act
      const result = await service.create(userId, createDrawingDto);

      // Assert
      expect(result).toEqual(mockDrawing);
    });

    it('should throw BadRequestException for invalid vertical_line coordinates', async () => {
      // Arrange
      const userId = 'user-123';
      const createDrawingDto = {
        stockCode: '600519',
        period: 'daily' as const,
        drawingType: 'vertical_line' as const,
        coordinates: JSON.stringify([]), // Empty
      };

      // Act & Assert
      await expect(service.create(userId, createDrawingDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
