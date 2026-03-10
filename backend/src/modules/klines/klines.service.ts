import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetKLinesDto } from './dto/get-klines.dto';

@Injectable()
export class KLinesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取 K线数据
   */
  async getKLineData(stockCode: string, dto: GetKLinesDto) {
    const { period = 'daily', startDate, endDate, limit = 500 } = dto;

    // 验证股票是否存在
    const stock = await this.prisma.stock.findUnique({
      where: { stockCode },
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${stockCode} not found`);
    }

    const where: any = {
      stockCode,
      period,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const data = await this.prisma.kLineData.findMany({
      where,
      orderBy: { date: 'asc' },
      take: limit,
    });

    return {
      stockCode,
      period,
      data,
      count: data.length,
    };
  }

  /**
   * 获取最新一条 K线数据
   */
  async getLatestKLine(stockCode: string, period: 'daily' | 'weekly' = 'daily') {
    return this.prisma.kLineData.findFirst({
      where: { stockCode, period },
      orderBy: { date: 'desc' },
    });
  }
}
