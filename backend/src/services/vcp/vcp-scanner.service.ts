import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { TrendTemplateService, TrendTemplateInput } from './trend-template.service';
import { RsRatingService, StockReturn } from './rs-rating.service';
import { VcpAnalyzerService, KLineBar } from './vcp-analyzer.service';

@Injectable()
export class VcpScannerService {
  private readonly logger = new Logger(VcpScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trendTemplate: TrendTemplateService,
    private readonly rsRating: RsRatingService,
    private readonly vcpAnalyzer: VcpAnalyzerService,
  ) {}

  async scanAllStocks(scanDate?: Date): Promise<{ passed: number; skipped: number; failed: number; total: number }> {
    const date = scanDate || new Date();
    const dateStr = date.toISOString().split('T')[0];
    this.logger.log(`Starting VCP scan for ${dateStr}`);

    const stocks = await this.prisma.stock.findMany({
      where: { admissionStatus: 'active' },
      select: { stockCode: true, stockName: true },
    });

    this.logger.log(`Found ${stocks.length} active stocks`);

    const rsRatings = await this.calculateRsRatingsForAll(stocks.map((s: { stockCode: string; stockName: string }) => s.stockCode));
    const rsMap = new Map(rsRatings.map(r => [r.stockCode, r]));

    await this.prisma.vcpScanResult.deleteMany({
      where: { scanDate: { gte: new Date(dateStr), lt: new Date(new Date(dateStr).getTime() + 86400000) } },
    });

    let passed = 0;
    let skipped = 0;
    let skippedInsufficientData = 0;
    let skippedNoVcp = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      try {
        const result = await this.analyzeStock(stock.stockCode, rsMap.get(stock.stockCode)?.rsRating ?? 0);
        if (!result) {
          skippedInsufficientData++;
          skipped++;
          continue;
        }

        // Save all analysis results to database
        await this.prisma.vcpScanResult.create({
          data: {
            stockCode: stock.stockCode,
            scanDate: new Date(dateStr),
            trendTemplatePass: result.trendTemplatePass,
            trendTemplateDetails: JSON.stringify(result.trendTemplateResult),
            contractionCount: result.vcpResult.contractionCount,
            lastContractionPct: result.vcpResult.lastContractionPct,
            contractions: JSON.stringify(result.vcpResult.contractions),
            volumeDryingUp: result.vcpResult.volumeDryingUp,
            rsRating: rsMap.get(stock.stockCode)?.rsRating ?? 0,
            latestPrice: result.latestPrice,
            priceChangePct: result.priceChangePct,
            distFrom52WeekHigh: result.distFrom52WeekHigh,
            distFrom52WeekLow: result.distFrom52WeekLow,
          },
        });
        
        if (result.trendTemplatePass && result.hasVcp) {
          passed++;
        } else {
          skippedNoVcp++;
          skipped++;
        }
      } catch (error: any) {
        this.logger.warn(`Failed to analyze ${stock.stockCode}: ${error.message}`);
        failed++;
      }

      if ((i + 1) % 500 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        this.logger.log(`Progress: ${i + 1}/${stocks.length} (${elapsed}s elapsed, ${passed} passed)`);
      }
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(JSON.stringify({
      event: 'vcp_scan_summary',
      passed,
      skipped,
      skippedInsufficientData,
      skippedNoVcp,
      failed,
      total: stocks.length,
      elapsedSeconds: totalElapsed,
    }));
    return { passed, skipped, failed, total: stocks.length };
  }

  private async analyzeStock(stockCode: string, rsRating: number) {
    const klines = await this.prisma.kLineData.findMany({
      where: { stockCode, period: 'daily' },
      orderBy: { date: 'asc' },
      take: 300,
      select: { date: true, open: true, high: true, low: true, close: true, volume: true, amount: true },
    });

    if (klines.length < 252) return null;

    const latestIndicators = await this.getLatestIndicators(stockCode);
    if (!latestIndicators) return null;

    const latest = klines[klines.length - 1];
    const prev = klines.length >= 2 ? klines[klines.length - 2] : latest;
    const priceChangePct = prev.close > 0 ? ((latest.close - prev.close) / prev.close) * 100 : 0;

    const ttInput: TrendTemplateInput = {
      currentPrice: latest.close,
      ma50: latestIndicators.ma50,
      ma150: latestIndicators.ma150,
      ma200: latestIndicators.ma200,
      ma200_22dAgo: latestIndicators.ma200_22dAgo,
      high52Week: latestIndicators.high52Week,
      low52Week: latestIndicators.low52Week,
      rsRating,
    };

    const ttResult = this.trendTemplate.runAllChecks(ttInput);

    const bars: KLineBar[] = klines.map((k: { date: Date; open: number; high: number; low: number; close: number; volume: number }) => ({
      date: k.date.toISOString().split('T')[0],
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));

    const vcpResult = this.vcpAnalyzer.analyze(bars);

    const distHigh = latestIndicators.high52Week > 0
      ? ((latestIndicators.high52Week - latest.close) / latestIndicators.high52Week) * 100
      : 0;
    const distLow = latestIndicators.low52Week > 0
      ? ((latest.close - latestIndicators.low52Week) / latestIndicators.low52Week) * 100
      : 0;

    return {
      trendTemplatePass: ttResult.allPass,
      trendTemplateResult: ttResult,
      hasVcp: vcpResult.hasVcp,
      vcpResult,
      latestPrice: latest.close,
      priceChangePct: Math.round(priceChangePct * 100) / 100,
      distFrom52WeekHigh: Math.round(distHigh * 100) / 100,
      distFrom52WeekLow: Math.round(distLow * 100) / 100,
    };
  }

  private async getLatestIndicators(stockCode: string) {
    const maIndicator = await this.prisma.technicalIndicator.findFirst({
      where: { stockCode, period: 'daily', indicatorType: 'ma' },
      orderBy: { date: 'desc' },
    });

    const ma22dAgo = await this.prisma.technicalIndicator.findFirst({
      where: { stockCode, period: 'daily', indicatorType: 'ma' },
      orderBy: { date: 'desc' },
      skip: 22,
    });

    const week52 = await this.prisma.technicalIndicator.findFirst({
      where: { stockCode, period: 'daily', indicatorType: 'week52_marker' },
      orderBy: { date: 'desc' },
    });

    if (!maIndicator || !week52) return null;

    const maValues = JSON.parse(maIndicator.values);
    const ma22Values = ma22dAgo ? JSON.parse(ma22dAgo.values) : maValues;
    const w52Values = JSON.parse(week52.values);

    return {
      ma50: maValues.ma50 ?? 0,
      ma150: maValues.ma150 ?? 0,
      ma200: maValues.ma200 ?? 0,
      ma200_22dAgo: ma22Values.ma200 ?? 0,
      high52Week: w52Values.high ?? w52Values.high52Week ?? 0,
      low52Week: w52Values.low ?? w52Values.low52Week ?? 0,
    };
  }

  private async calculateRsRatingsForAll(stockCodes: string[]) {
    const returns: StockReturn[] = [];

    for (const code of stockCodes) {
      const latest = await this.prisma.kLineData.findFirst({
        where: { stockCode: code, period: 'daily' },
        orderBy: { date: 'desc' },
        select: { close: true },
      });

      const oneYearAgo = await this.prisma.kLineData.findFirst({
        where: { stockCode: code, period: 'daily' },
        orderBy: { date: 'desc' },
        skip: 252,
        select: { close: true },
      });

      if (latest && oneYearAgo) {
        returns.push({
          stockCode: code,
          oneYearReturn: this.rsRating.calculateOneYearReturn(latest.close, oneYearAgo.close),
        });
      }
    }

    return this.rsRating.calculateAllRsRatings(returns);
  }
}
