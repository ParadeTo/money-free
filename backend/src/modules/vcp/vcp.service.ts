import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetVcpScanDto } from './dto/get-vcp-scan.dto';

@Injectable()
export class VcpService {
  private readonly logger = new Logger(VcpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLatestScanResults(dto: GetVcpScanDto) {
    const sortBy = dto.sortBy || 'lastContractionPct';
    const sortOrder = dto.sortOrder || 'asc';

    const latestResult = await this.prisma.vcpScanResult.findFirst({
      orderBy: { scanDate: 'desc' },
      select: { scanDate: true },
    });

    if (!latestResult) {
      return { stocks: [], totalCount: 0, scanDate: '' };
    }

    const scanDate = latestResult.scanDate;

    const orderByMap: Record<string, any> = {
      contractionCount: { contractionCount: sortOrder },
      lastContractionPct: { lastContractionPct: sortOrder },
      volumeDryingUp: { volumeDryingUp: sortOrder },
      rsRating: { rsRating: sortOrder },
      priceChangePct: { priceChangePct: sortOrder },
    };

    const results = await this.prisma.vcpScanResult.findMany({
      where: { scanDate },
      orderBy: orderByMap[sortBy] || { lastContractionPct: 'asc' },
      include: { stock: { select: { stockName: true } } },
    });

    const stocks = results.map((r: typeof results[number]) => ({
      stockCode: r.stockCode,
      stockName: r.stock.stockName,
      latestPrice: r.latestPrice,
      priceChangePct: r.priceChangePct,
      distFrom52WeekHigh: r.distFrom52WeekHigh,
      distFrom52WeekLow: r.distFrom52WeekLow,
      contractionCount: r.contractionCount,
      lastContractionPct: r.lastContractionPct,
      volumeDryingUp: r.volumeDryingUp,
      rsRating: r.rsRating,
    }));

    return {
      stocks,
      totalCount: stocks.length,
      scanDate: scanDate.toISOString().split('T')[0],
    };
  }

  async getStockVcpDetail(stockCode: string) {
    const result = await this.prisma.vcpScanResult.findFirst({
      where: { stockCode },
      orderBy: { scanDate: 'desc' },
      include: { stock: { select: { stockName: true } } },
    });

    if (!result) {
      throw new NotFoundException(`No VCP data found for ${stockCode}`);
    }

    const trendTemplateDetails = JSON.parse(result.trendTemplateDetails);
    const contractions = JSON.parse(result.contractions);

    return {
      stockCode: result.stockCode,
      stockName: result.stock.stockName,
      scanDate: result.scanDate.toISOString().split('T')[0],
      trendTemplate: trendTemplateDetails,
      contractions,
      contractionCount: result.contractionCount,
      lastContractionPct: result.lastContractionPct,
      volumeDryingUp: result.volumeDryingUp,
      rsRating: result.rsRating,
    };
  }
}
