import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetIndicatorsDto } from './dto/get-indicators.dto';

@Injectable()
export class IndicatorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取技术指标数据
   */
  async getIndicators(stockCode: string, dto: GetIndicatorsDto) {
    const { period = 'daily', indicators, startDate, endDate } = dto;

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

    if (indicators && indicators.length > 0) {
      // 转换类型为小写以匹配数据库
      const normalizedTypes = indicators.map((type) => {
        const typeMap: Record<string, string> = {
          MA: 'ma',
          KDJ: 'kdj',
          RSI: 'rsi',
          VOLUME: 'volume',
          AMOUNT: 'amount',
          WEEK52: 'week52_marker',
        };
        return typeMap[type.toUpperCase()] || type.toLowerCase();
      });
      where.indicatorType = { in: normalizedTypes };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const data = await this.prisma.technicalIndicator.findMany({
      where,
      orderBy: [{ indicatorType: 'asc' }, { date: 'asc' }],
    });

    // 将 values 字段从 JSON 字符串解析为对象
    const parsedData = data.map((item) => ({
      ...item,
      values: JSON.parse(item.values),
    }));

    return {
      stockCode,
      period,
      data: parsedData,
      count: parsedData.length,
    };
  }

  /**
   * 获取 52周最高/最低标注
   */
  async get52WeekMarkers(stockCode: string, period: 'daily' | 'weekly' = 'daily') {
    const stock = await this.prisma.stock.findUnique({
      where: { stockCode },
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${stockCode} not found`);
    }

    const marker = await this.prisma.technicalIndicator.findFirst({
      where: {
        stockCode,
        period,
        indicatorType: 'week52_marker',
      },
      orderBy: { date: 'desc' },
    });

    if (!marker) {
      // 返回明确的空数据响应，而不是 null
      return {
        stockCode,
        period,
        high52Week: null,
        low52Week: null,
        high52WeekDate: null,
        low52WeekDate: null,
        date: null,
      };
    }

    return {
      stockCode,
      period,
      ...JSON.parse(marker.values),
      date: marker.date,
    };
  }
}
