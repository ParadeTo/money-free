import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, dto: AddFavoriteDto) {
    const stockCode = dto.stock_code.trim();
    const groupName = dto.group_name?.trim() || null;

    const stock = await this.prisma.stock.findUnique({
      where: { stockCode },
    });

    if (!stock) {
      throw new BadRequestException(`股票代码 ${stockCode} 不存在`);
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_stockCode: { userId, stockCode },
      },
    });

    if (existing) {
      throw new ConflictException('股票已在收藏列表中');
    }

    const maxSort = await this.prisma.favorite.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        stockCode,
        groupName,
        sortOrder,
      },
      include: {
        stock: true,
      },
    });

    return {
      id: favorite.id,
      user_id: favorite.userId,
      stock_code: favorite.stockCode,
      stock_name: favorite.stock.stockName,
      group_name: favorite.groupName,
      sort_order: favorite.sortOrder,
      created_at: favorite.createdAt.toISOString(),
    };
  }

  async getFavorites(userId: string, groupName?: string) {
    const where: { userId: string; groupName?: string } = { userId };
    if (groupName) {
      where.groupName = groupName;
    }

    const favorites = await this.prisma.favorite.findMany({
      where,
      include: { stock: true },
      orderBy: { sortOrder: 'asc' },
    });

    const result = await Promise.all(
      favorites.map(async (fav) => {
        const latestKlines = await this.prisma.kLineData.findMany({
          where: { stockCode: fav.stockCode, period: 'daily' },
          orderBy: { date: 'desc' },
          take: 2,
        });
        const latestKline = latestKlines[0];
        const prevKline = latestKlines[1];

        let latestPrice: number | null = null;
        let priceChange: number | null = null;
        let priceChangePercent: number | null = null;

        if (latestKline) {
          latestPrice = latestKline.close;
          if (prevKline) {
            priceChange = latestKline.close - prevKline.close;
            priceChangePercent =
              prevKline.close > 0
                ? (priceChange / prevKline.close) * 100
                : 0;
          } else {
            priceChange = latestKline.close - latestKline.open;
            priceChangePercent =
              latestKline.open > 0
                ? ((latestKline.close - latestKline.open) / latestKline.open) *
                  100
                : 0;
          }
        }

        return {
          id: fav.id,
          stock_code: fav.stockCode,
          stock_name: fav.stock.stockName,
          group_name: fav.groupName,
          sort_order: fav.sortOrder,
          latest_price: latestPrice,
          price_change: priceChange,
          price_change_percent: priceChangePercent,
          created_at: fav.createdAt.toISOString(),
        };
      }),
    );

    return {
      favorites: result,
      total: result.length,
    };
  }

  async updateSort(userId: string, favoriteId: number, sortOrder: number) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }

    if (favorite.userId !== userId) {
      throw new NotFoundException('收藏不存在');
    }

    await this.prisma.favorite.update({
      where: { id: favoriteId },
      data: { sortOrder },
    });

    return {
      message: '排序更新成功',
      favorite_id: favoriteId,
      sort_order: sortOrder,
    };
  }

  async removeFavorite(userId: string, favoriteId: number) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('收藏不存在');
    }

    if (favorite.userId !== userId) {
      throw new NotFoundException('收藏不存在');
    }

    await this.prisma.favorite.delete({
      where: { id: favoriteId },
    });

    return {
      message: '取消收藏成功',
      favorite_id: favoriteId,
    };
  }
}
