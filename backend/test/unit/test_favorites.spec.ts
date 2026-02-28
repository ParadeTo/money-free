// backend/test/unit/test_favorites.spec.ts
// T177: Unit tests for FavoritesService

import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesService } from '../../src/modules/favorites/favorites.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    favorite: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    stock: {
      findUnique: jest.fn(),
    },
    kLineData: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('addFavorite (create)', () => {
    it('should create a favorite successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const addDto = { stock_code: '600519', group_name: '白酒' };

      const mockStock = {
        stockCode: '600519',
        stockName: '贵州茅台',
        market: 'SH',
        admissionStatus: 'active',
      };

      const mockFavorite = {
        id: 1,
        userId,
        stockCode: '600519',
        groupName: '白酒',
        sortOrder: 0,
        createdAt: new Date(),
        stock: mockStock,
      };

      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.aggregate.mockResolvedValue({
        _max: { sortOrder: null },
      });
      mockPrismaService.favorite.create.mockResolvedValue(mockFavorite);

      // Act
      const result = await service.addFavorite(userId, addDto);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('stock_code', '600519');
      expect(result).toHaveProperty('stock_name', '贵州茅台');
      expect(result).toHaveProperty('group_name', '白酒');
      expect(mockPrismaService.stock.findUnique).toHaveBeenCalledWith({
        where: { stockCode: '600519' },
      });
      expect(mockPrismaService.favorite.findUnique).toHaveBeenCalledWith({
        where: { userId_stockCode: { userId, stockCode: '600519' } },
      });
      expect(mockPrismaService.favorite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          stockCode: '600519',
          groupName: '白酒',
          sortOrder: 0,
        }),
        include: { stock: true },
      });
    });

    it('should throw ConflictException when favoriting same stock twice', async () => {
      // Arrange
      const userId = 'user-123';
      const addDto = { stock_code: '600519' };

      const mockStock = {
        stockCode: '600519',
        stockName: '贵州茅台',
        market: 'SH',
      };

      const existingFavorite = {
        id: 1,
        userId,
        stockCode: '600519',
        groupName: null,
        sortOrder: 0,
      };

      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockPrismaService.favorite.findUnique.mockResolvedValue(existingFavorite);

      // Act & Assert
      await expect(service.addFavorite(userId, addDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.addFavorite(userId, addDto)).rejects.toThrow(
        '股票已在收藏列表中',
      );
      expect(mockPrismaService.favorite.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock code is invalid', async () => {
      // Arrange
      const userId = 'user-123';
      const addDto = { stock_code: '999999' };

      mockPrismaService.stock.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addFavorite(userId, addDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addFavorite(userId, addDto)).rejects.toThrow(
        /股票代码.*不存在/,
      );
      expect(mockPrismaService.favorite.create).not.toHaveBeenCalled();
    });

    it('should create favorite without groupName when optional', async () => {
      // Arrange
      const userId = 'user-123';
      const addDto = { stock_code: '000001' };

      const mockStock = {
        stockCode: '000001',
        stockName: '平安银行',
        market: 'SZ',
      };

      const mockFavorite = {
        id: 2,
        userId,
        stockCode: '000001',
        groupName: null,
        sortOrder: 0,
        createdAt: new Date(),
        stock: mockStock,
      };

      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.aggregate.mockResolvedValue({
        _max: { sortOrder: 0 },
      });
      mockPrismaService.favorite.create.mockResolvedValue(mockFavorite);

      // Act
      const result = await service.addFavorite(userId, addDto);

      // Assert
      expect(result).toHaveProperty('stock_code', '000001');
      expect(mockPrismaService.favorite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          stockCode: '000001',
          groupName: null,
        }),
        include: { stock: true },
      });
    });
  });

  describe('getFavorites (findAll)', () => {
    it('should return all favorites for user ordered by sortOrder', async () => {
      // Arrange
      const userId = 'user-123';

      const mockFavorites = [
        {
          id: 1,
          userId,
          stockCode: '600519',
          groupName: '白酒',
          sortOrder: 0,
          createdAt: new Date(),
          stock: {
            stockCode: '600519',
            stockName: '贵州茅台',
            market: 'SH',
          },
        },
        {
          id: 2,
          userId,
          stockCode: '000001',
          groupName: '白酒',
          sortOrder: 1,
          createdAt: new Date(),
          stock: {
            stockCode: '000001',
            stockName: '平安银行',
            market: 'SZ',
          },
        },
      ];

      mockPrismaService.favorite.findMany.mockResolvedValue(mockFavorites);
      mockPrismaService.kLineData.findMany
        .mockResolvedValueOnce([
          { close: 1850.5, open: 1840, date: new Date('2026-02-28') },
          { close: 1840, open: 1835, date: new Date('2026-02-27') },
        ])
        .mockResolvedValueOnce([
          { close: 12.35, open: 12.2, date: new Date('2026-02-28') },
          { close: 12.2, open: 12.1, date: new Date('2026-02-27') },
        ]);

      // Act
      const result = await service.getFavorites(userId);

      // Assert
      expect(result).toHaveProperty('favorites');
      expect(result).toHaveProperty('total', 2);
      expect(result.favorites).toHaveLength(2);
      expect(mockPrismaService.favorite.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { sortOrder: 'asc' },
        include: { stock: true },
      });
      expect(result.favorites[0]).toHaveProperty('stock_name');
      expect(result.favorites[0]).toHaveProperty('latest_price');
      expect(result.favorites[0]).toHaveProperty('price_change_percent');
    });

    it('should include stock info and latest price/change percent', async () => {
      // Arrange
      const userId = 'user-123';

      const mockFavorites = [
        {
          id: 1,
          userId,
          stockCode: '600519',
          groupName: null,
          sortOrder: 0,
          createdAt: new Date(),
          stock: {
            stockCode: '600519',
            stockName: '贵州茅台',
            market: 'SH',
          },
        },
      ];

      mockPrismaService.favorite.findMany.mockResolvedValue(mockFavorites);
      mockPrismaService.kLineData.findMany.mockResolvedValue([
        { close: 1850.5, open: 1840, date: new Date('2026-02-28') },
        { close: 1840, open: 1835, date: new Date('2026-02-27') },
      ]);

      // Act
      const result = await service.getFavorites(userId);

      // Assert
      expect(result.favorites[0].stock_name).toBe('贵州茅台');
      expect(result.favorites[0].latest_price).toBe(1850.5);
      expect(result.favorites[0].price_change_percent).toBeDefined();
    });

    it('should filter by groupName when provided', async () => {
      // Arrange
      const userId = 'user-123';
      const groupName = '白酒';

      mockPrismaService.favorite.findMany.mockResolvedValue([]);

      // Act
      await service.getFavorites(userId, groupName);

      // Assert
      expect(mockPrismaService.favorite.findMany).toHaveBeenCalledWith({
        where: { userId, groupName },
        orderBy: { sortOrder: 'asc' },
        include: { stock: true },
      });
    });

    it('should only return favorites belonging to the user', async () => {
      // Arrange
      const userId = 'user-123';

      mockPrismaService.favorite.findMany.mockResolvedValue([]);

      // Act
      await service.getFavorites(userId);

      // Assert
      expect(mockPrismaService.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
    });

    it('should return empty array when user has no favorites', async () => {
      // Arrange
      const userId = 'user-123';

      mockPrismaService.favorite.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getFavorites(userId);

      // Assert
      expect(result.favorites).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('updateSort (updateSortOrder)', () => {
    it('should update sort order successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const favoriteId = 1;
      const sortOrder = 5;

      const mockFavorite = {
        id: favoriteId,
        userId,
        stockCode: '600519',
        groupName: '白酒',
        sortOrder: 0,
        createdAt: new Date(),
      };

      mockPrismaService.favorite.findUnique.mockResolvedValue(mockFavorite);
      mockPrismaService.favorite.update.mockResolvedValue({
        ...mockFavorite,
        sortOrder,
      });

      // Act
      const result = await service.updateSort(userId, favoriteId, sortOrder);

      // Assert
      expect(result).toHaveProperty('message', '排序更新成功');
      expect(result).toHaveProperty('favorite_id', favoriteId);
      expect(result).toHaveProperty('sort_order', sortOrder);
      expect(mockPrismaService.favorite.update).toHaveBeenCalledWith({
        where: { id: favoriteId },
        data: { sortOrder },
      });
    });

    it('should throw NotFoundException when favorite does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const favoriteId = 999;

      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateSort(userId, favoriteId, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateSort(userId, favoriteId, 1),
      ).rejects.toThrow('收藏不存在');
      expect(mockPrismaService.favorite.update).not.toHaveBeenCalled();
    });

    it('should not allow updating favorites of other users', async () => {
      // Arrange
      const userId = 'user-123';
      const favoriteId = 1;
      const otherUserFavorite = {
        id: favoriteId,
        userId: 'user-456',
        stockCode: '600519',
        groupName: '白酒',
        sortOrder: 0,
        createdAt: new Date(),
      };

      mockPrismaService.favorite.findUnique.mockResolvedValue(otherUserFavorite);

      // Act & Assert
      await expect(
        service.updateSort(userId, favoriteId, 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateSort(userId, favoriteId, 1),
      ).rejects.toThrow('收藏不存在');
      expect(mockPrismaService.favorite.update).not.toHaveBeenCalled();
    });
  });

  describe('removeFavorite (remove)', () => {
    it('should delete a favorite successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const favoriteId = 1;

      const mockFavorite = {
        id: favoriteId,
        userId,
        stockCode: '600519',
        groupName: '白酒',
        sortOrder: 0,
        createdAt: new Date(),
      };

      mockPrismaService.favorite.findUnique.mockResolvedValue(mockFavorite);
      mockPrismaService.favorite.delete.mockResolvedValue(mockFavorite);

      // Act
      const result = await service.removeFavorite(userId, favoriteId);

      // Assert
      expect(result).toHaveProperty('message', '取消收藏成功');
      expect(result).toHaveProperty('favorite_id', favoriteId);
      expect(mockPrismaService.favorite.delete).toHaveBeenCalledWith({
        where: { id: favoriteId },
      });
    });

    it('should throw NotFoundException when favorite does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const favoriteId = 999;

      mockPrismaService.favorite.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeFavorite(userId, favoriteId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeFavorite(userId, favoriteId),
      ).rejects.toThrow('收藏不存在');
      expect(mockPrismaService.favorite.delete).not.toHaveBeenCalled();
    });

    it('should not allow deleting favorites of other users', async () => {
      // Arrange
      const userId = 'user-123';
      const favoriteId = 1;
      const otherUserFavorite = {
        id: favoriteId,
        userId: 'user-456',
        stockCode: '600519',
        groupName: '白酒',
        sortOrder: 0,
        createdAt: new Date(),
      };

      mockPrismaService.favorite.findUnique.mockResolvedValue(otherUserFavorite);

      // Act & Assert
      await expect(
        service.removeFavorite(userId, favoriteId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeFavorite(userId, favoriteId),
      ).rejects.toThrow('收藏不存在');
      expect(mockPrismaService.favorite.delete).not.toHaveBeenCalled();
    });
  });
});
