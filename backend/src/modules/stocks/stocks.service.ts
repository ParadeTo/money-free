import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchStockDto } from './dto/search-stock.dto';

@Injectable()
export class StocksService {
  constructor(private prisma: PrismaService) {}

  /**
   * 搜索股票
   */
  async search(dto: SearchStockDto) {
    const { search, market, admissionStatus = 'active', page = 1, limit = 20 } = dto;

    const where: any = {
      admissionStatus,
    };

    if (market) {
      where.market = market;
    }

    if (search) {
      where.OR = [
        { stockCode: { contains: search } },
        { stockName: { contains: search } },
        { stockCode: { startsWith: search } },
        { searchKeywords: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { stockCode: 'asc' },
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取股票详情
   */
  async getStockDetail(stockCode: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { stockCode },
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${stockCode} not found`);
    }

    return stock;
  }

  /**
   * 获取所有股票列表（用于数据初始化）
   */
  async getAllStocks() {
    return this.prisma.stock.findMany({
      where: { admissionStatus: 'active' },
      orderBy: { stockCode: 'asc' },
    });
  }
}
