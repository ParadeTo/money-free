import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetVcpScanDto } from './dto/get-vcp-scan.dto';
import { VcpAnalyzerService, KLineBar, PullbackResult } from '../../services/vcp/vcp-analyzer.service';
import { VcpEarlyFilterService } from '../../services/vcp/vcp-early-filter.service';
import { FilterConditions, FilterResult } from '../../types/vcp-early-stage';
import { VcpAnalysisResponseDto, ContractionDto, PullbackDto, KLineDto, TrendTemplateCheckDto } from './dto/vcp-analysis-response.dto';

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
    const maxPullbackPct = dto.maxPullbackPct;

    // 手动处理 inPullbackOnly 参数
    let inPullbackOnly = false;
    if (dto.inPullbackOnly !== undefined && dto.inPullbackOnly !== null) {
      if (typeof dto.inPullbackOnly === 'string') {
        inPullbackOnly = dto.inPullbackOnly.toLowerCase() === 'true';
      } else {
        inPullbackOnly = Boolean(dto.inPullbackOnly);
      }
    }

    // 查询所有符合基本条件的扫描结果（不限制日期）
    const whereClause: any = {
      trendTemplatePass: true,
      contractionCount: { gte: 3 },
    };

    // 如果只要处于回调中的股票
    if (inPullbackOnly === true) {
      whereClause.inPullback = true;
    }

    // 获取所有符合条件的记录，按股票代码和扫描日期排序
    const allResults = await this.prisma.vcpScanResult.findMany({
      where: whereClause,
      orderBy: [{ stockCode: 'asc' }, { scanDate: 'desc' }],
      include: { stock: { select: { stockName: true, market: true, currency: true } } },
    });

    // 如果没有任何结果，直接返回空
    if (allResults.length === 0) {
      return { stocks: [], totalCount: 0, scanDate: '' };
    }

    // 为每只股票保留最新的扫描记录
    const latestResultsMap = new Map<string, typeof allResults[0]>();
    for (const result of allResults) {
      if (!latestResultsMap.has(result.stockCode)) {
        latestResultsMap.set(result.stockCode, result);
      }
    }

    // 转换为数组并排序
    const results = Array.from(latestResultsMap.values());
    const orderByMap: Record<string, (a: any, b: any) => number> = {
      contractionCount: (a, b) => sortOrder === 'asc' ? a.contractionCount - b.contractionCount : b.contractionCount - a.contractionCount,
      lastContractionPct: (a, b) => sortOrder === 'asc' ? a.lastContractionPct - b.lastContractionPct : b.lastContractionPct - a.lastContractionPct,
      volumeDryingUp: (a, b) => sortOrder === 'asc' ? (a.volumeDryingUp ? 1 : 0) - (b.volumeDryingUp ? 1 : 0) : (b.volumeDryingUp ? 1 : 0) - (a.volumeDryingUp ? 1 : 0),
      rsRating: (a, b) => sortOrder === 'asc' ? a.rsRating - b.rsRating : b.rsRating - a.rsRating,
      priceChangePct: (a, b) => sortOrder === 'asc' ? a.priceChangePct - b.priceChangePct : b.priceChangePct - a.priceChangePct,
    };
    
    if (orderByMap[sortBy]) {
      results.sort(orderByMap[sortBy]);
    }

    // 如果设置了最大回调幅度，需要实时分析K线获取当前回调状态
    let stocks = [];
    if (maxPullbackPct !== undefined && maxPullbackPct > 0) {
      // 实时分析每只股票的当前回调状态
      for (const r of results) {
        const klines = await this.prisma.kLineData.findMany({
          where: { stockCode: r.stockCode, period: 'daily' },
          orderBy: { date: 'desc' },
          take: 300,
          select: { date: true, open: true, high: true, low: true, close: true, volume: true },
        });

        if (klines.length === 0) continue;

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
        const pullbacks = analysis.pullbacks || [];
        const lastBar = bars[bars.length - 1];

        let currentPullback = null;
        if (pullbacks.length > 0) {
          const lastPullback = pullbacks[pullbacks.length - 1];
          const lastPullbackLowDate = new Date(lastPullback.lowDate);
          const lastBarDate = new Date(lastBar.date);
          const daysSinceLow = Math.floor((lastBarDate.getTime() - lastPullbackLowDate.getTime()) / (1000 * 60 * 60 * 24));

          // 只关注最近20天内的回调
          if (daysSinceLow <= 20) {
            const recoveryPct = ((lastBar.close - lastPullback.lowPrice) / lastPullback.lowPrice) * 100;
            currentPullback = {
              ...lastPullback,
              daysSinceLow,
              recoveryPct,
            };
          }
        }

        // 过滤：只保留没有回调或回调幅度 < maxPullbackPct 的股票
        if (!currentPullback || currentPullback.pullbackPct < maxPullbackPct) {
          stocks.push({
            stockCode: r.stockCode,
            stockName: r.stock.stockName,
            market: r.stock.market,
            currency: r.stock.currency,
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
            lastPullback: currentPullback,
          });
        }
      }
    } else {
      // 不过滤，直接映射
      stocks = results.map((r: typeof results[number]) => ({
        stockCode: r.stockCode,
        stockName: r.stock.stockName,
        market: r.stock.market,
        currency: r.stock.currency,
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
    }

    // 获取所有结果中最新的扫描日期
    const latestScanDate = results.length > 0 
      ? results.reduce((latest, r) => r.scanDate > latest ? r.scanDate : latest, results[0].scanDate)
      : new Date();

    return {
      stocks,
      totalCount: stocks.length,
      scanDate: latestScanDate.toISOString().split('T')[0],
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

  /**
   * Generate VCP analysis for a single stock (T024 [US1])
   * 
   * @param stockCode Stock code (e.g., "605117")
   * @param forceRefresh Force real-time analysis (ignore cache)
   * @returns Complete VCP analysis result
   * @throws NotFoundException if stock not found
   * @throws BadRequestException if K-line data insufficient
   */
  async generateAnalysis(
    stockCode: string,
    forceRefresh = false,
  ): Promise<VcpAnalysisResponseDto> {
    const startTime = Date.now();

    // 1. Get stock information
    const stock = await this.prisma.stock.findUnique({
      where: { stockCode },
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${stockCode} not found`);
    }

    let cached = false;
    let scanDate: Date = new Date();
    let analysisData: any;

    // 2. Check cache (if not forcing refresh)
    if (!forceRefresh) {
      const cachedResult = await this.prisma.vcpScanResult.findFirst({
        where: { stockCode },
        orderBy: { scanDate: 'desc' },
      });

      if (cachedResult) {
        cached = true;
        scanDate = cachedResult.scanDate;
        analysisData = {
          hasVcp: cachedResult.contractionCount >= 2,
          summary: {
            contractionCount: cachedResult.contractionCount,
            lastContractionPct: cachedResult.lastContractionPct,
            volumeDryingUp: cachedResult.volumeDryingUp,
            rsRating: cachedResult.rsRating,
            inPullback: cachedResult.inPullback,
            pullbackCount: cachedResult.pullbackCount,
            latestPrice: cachedResult.latestPrice,
            priceChangePct: cachedResult.priceChangePct,
            distFrom52WeekHigh: cachedResult.distFrom52WeekHigh,
            distFrom52WeekLow: cachedResult.distFrom52WeekLow,
          },
          contractions: JSON.parse(cachedResult.contractions),
          trendTemplate: JSON.parse(cachedResult.trendTemplateDetails),
          lastPullbackData: cachedResult.lastPullbackData ? JSON.parse(cachedResult.lastPullbackData) : null,
        };
      }
    }

    // 3. If no cache or force refresh, perform real-time analysis
    if (!cached || forceRefresh) {
      const klines = await this.prisma.kLineData.findMany({
        where: { stockCode, period: 'daily' },
        orderBy: { date: 'desc' },
        take: 300,
        select: { date: true, open: true, high: true, low: true, close: true, volume: true },
      });

      if (klines.length < 30) {
        throw new BadRequestException(
          `Insufficient K-line data for ${stockCode} (< 30 days, found: ${klines.length})`
        );
      }

      const sortedKlines = klines.reverse();
      const bars: KLineBar[] = sortedKlines.map((k: any) => ({
        date: k.date.toISOString().split('T')[0],
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      }));

      const vcpAnalysisResult = this.vcpAnalyzer.analyze(bars);
      scanDate = new Date();

      // Get trend template data (from latest scan result or calculate)
      const latestScan = await this.prisma.vcpScanResult.findFirst({
        where: { stockCode },
        orderBy: { scanDate: 'desc' },
      });

      const trendTemplateDetails = latestScan 
        ? JSON.parse(latestScan.trendTemplateDetails)
        : { pass: false, checks: [] };

      const latestBar = bars[bars.length - 1];
      const prevBar = bars[bars.length - 2];
      const priceChangePct = prevBar 
        ? ((latestBar.close - prevBar.close) / prevBar.close) * 100
        : 0;

      analysisData = {
        hasVcp: vcpAnalysisResult.hasVcp,
        summary: {
          contractionCount: vcpAnalysisResult.contractionCount,
          lastContractionPct: vcpAnalysisResult.lastContractionPct,
          volumeDryingUp: vcpAnalysisResult.volumeDryingUp,
          rsRating: latestScan?.rsRating || 0,
          inPullback: vcpAnalysisResult.pullbacks && vcpAnalysisResult.pullbacks.length > 0,
          pullbackCount: vcpAnalysisResult.pullbacks ? vcpAnalysisResult.pullbacks.length : 0,
          latestPrice: latestBar.close,
          priceChangePct,
          distFrom52WeekHigh: latestScan?.distFrom52WeekHigh || 0,
          distFrom52WeekLow: latestScan?.distFrom52WeekLow || 0,
        },
        contractions: vcpAnalysisResult.contractions,
        trendTemplate: trendTemplateDetails,
        pullbacks: vcpAnalysisResult.pullbacks || [],
        latestKLines: bars.slice(-10),
      };
    }

    // 4. Calculate if expired (>7 days)
    const daysSinceScan = Math.floor(
      (Date.now() - scanDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isExpired = daysSinceScan > 7;

    // 5. Get pullbacks with daysSinceLow calculation
    let pullbacks: PullbackDto[] = [];
    if (analysisData.lastPullbackData || analysisData.pullbacks) {
      const rawPullbacks = analysisData.pullbacks || (analysisData.lastPullbackData ? [analysisData.lastPullbackData] : []);
      const now = new Date();
      
      pullbacks = rawPullbacks.map((p: any, index: number) => {
        const lowDate = new Date(p.lowDate);
        const daysSinceLow = Math.floor((now.getTime() - lowDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          index: index + 1,
          highDate: p.highDate,
          highPrice: p.highPrice,
          lowDate: p.lowDate,
          lowPrice: p.lowPrice,
          pullbackPct: p.pullbackPct,
          durationDays: p.durationDays,
          avgVolume: p.avgVolume,
          isInUptrend: p.isInUptrend !== undefined ? p.isInUptrend : true,
          daysSinceLow,
        };
      });
    }

    // 6. Get recent K-line data with changePct
    const recentKLines = analysisData.latestKLines || [];
    const klines: KLineDto[] = recentKLines.map((k: KLineBar, i: number) => {
      const prevClose = i > 0 ? recentKLines[i - 1].close : k.open;
      const changePct = ((k.close - prevClose) / prevClose) * 100;
      
      return {
        date: k.date,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
        changePct: Math.round(changePct * 100) / 100,
      };
    });

    // 7. Format contractions
    const contractions: ContractionDto[] = (analysisData.contractions || []).map((c: any) => ({
      index: c.index,
      swingHighDate: c.swingHighDate,
      swingHighPrice: c.swingHighPrice,
      swingLowDate: c.swingLowDate,
      swingLowPrice: c.swingLowPrice,
      depthPct: c.depthPct,
      durationDays: c.durationDays,
      avgVolume: c.avgVolume,
    }));

    // 8. Build response
    const response: VcpAnalysisResponseDto = {
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      market: stock.market,
      currency: stock.currency,
      scanDate: scanDate.toISOString().split('T')[0],
      cached,
      isExpired,
      hasVcp: analysisData.hasVcp,
      summary: analysisData.summary,
      contractions,
      pullbacks,
      klines,
      trendTemplate: analysisData.trendTemplate,
    };

    // 9. Log analysis generation (T027)
    const elapsed = Date.now() - startTime;
    this.logger.log({
      action: 'vcp_analysis_generated',
      stockCode,
      cached,
      isExpired,
      hasVcp: analysisData.hasVcp,
      contractionCount: analysisData.summary.contractionCount,
      pullbackCount: analysisData.summary.pullbackCount,
      durationMs: elapsed,
    });

    return response;
  }
}
