import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetVcpScanDto } from './dto/get-vcp-scan.dto';
import { VcpAnalyzerService, KLineBar, PullbackResult } from '../../services/vcp/vcp-analyzer.service';
import { VcpEarlyFilterService } from '../../services/vcp/vcp-early-filter.service';
import { FilterConditions, FilterResult } from '../../types/vcp-early-stage';

@Injectable()
export class VcpService {
  private readonly logger = new Logger(VcpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vcpAnalyzer: VcpAnalyzerService,
    private readonly vcpEarlyFilter: VcpEarlyFilterService,
  ) { }

  async getLatestScanResults(dto: GetVcpScanDto) {
    const sortBy = dto.sortBy || 'lastContractionPct';
    const sortOrder = dto.sortOrder || 'asc';

    // 手动处理 inPullbackOnly 参数
    let inPullbackOnly = false;
    if (dto.inPullbackOnly !== undefined && dto.inPullbackOnly !== null) {
      if (typeof dto.inPullbackOnly === 'string') {
        inPullbackOnly = dto.inPullbackOnly.toLowerCase() === 'true';
      } else {
        inPullbackOnly = Boolean(dto.inPullbackOnly);
      }
    }

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

    const whereClause: any = {
      scanDate,
      trendTemplatePass: true,
      contractionCount: { gte: 3 },
    };

    // 如果只要处于回调中的股票
    if (inPullbackOnly === true) {
      whereClause.inPullback = true;
    }

    const results = await this.prisma.vcpScanResult.findMany({
      where: whereClause,
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
      inPullback: r.inPullback,
      pullbackCount: r.pullbackCount,
      lastPullback: r.lastPullbackData ? JSON.parse(r.lastPullbackData) : null,
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

    // 实时计算pullbacks（上涨中的回调）
    const klines = await this.prisma.kLineData.findMany({
      where: { stockCode, period: 'daily' },
      orderBy: { date: 'desc' },
      take: 300,
      select: { date: true, open: true, high: true, low: true, close: true, volume: true },
    });

    let pullbacks: PullbackResult[] = [];
    if (klines.length > 0) {
      const sortedKlines = klines.reverse();
      const bars: KLineBar[] = sortedKlines.map((k: any) => ({
        date: k.date.toISOString().split('T')[0],
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      }));

      const analysis = this.vcpAnalyzer.analyze(bars);
      pullbacks = analysis.pullbacks || [];
    }

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
      pullbacks,
    };
  }

  async filterEarlyStage(conditions: FilterConditions): Promise<FilterResult> {
    return this.vcpEarlyFilter.filterEarlyStage(conditions);
  }
}
