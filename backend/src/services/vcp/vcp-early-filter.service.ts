import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { VcpAnalyzerService, KLineBar, PullbackResult } from './vcp-analyzer.service';
import {
  FilterConditions,
  FilterResult,
  EarlyStageStock,
  VcpStage,
  PullbackInfo,
  ResultTip,
  QuickAction,
  VALIDATION_RULES,
} from '../../types/vcp-early-stage';

@Injectable()
export class VcpEarlyFilterService {
  private readonly logger = new Logger(VcpEarlyFilterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vcpAnalyzer: VcpAnalyzerService,
  ) {}

  async filterEarlyStage(conditions: FilterConditions): Promise<FilterResult> {
    this.logger.log({
      action: 'filter_early_stage_start',
      conditions,
    });

    this.validateConditions(conditions);

    const scanDate = await this.getLatestScanDate();
    if (!scanDate) {
      throw new BadRequestException('未找到VCP扫描数据，请先运行VCP扫描');
    }

    const baseResults = await this.queryVcpStocks(scanDate, conditions);
    
    this.logger.log({
      action: 'filter_early_stage_query_complete',
      baseResultsCount: baseResults.length,
    });

    const stocks: EarlyStageStock[] = [];
    
    for (const result of baseResults) {
      try {
        const stage = await this.calculateVcpStage(result.stockCode);
        
        stocks.push({
          stockCode: result.stockCode,
          stockName: result.stock.stockName,
          latestPrice: result.latestPrice,
          priceChangePct: result.priceChangePct,
          distFrom52WeekHigh: result.distFrom52WeekHigh,
          distFrom52WeekLow: result.distFrom52WeekLow,
          contractionCount: result.contractionCount,
          lastContractionPct: result.lastContractionPct,
          rsRating: result.rsRating,
          volumeDryingUp: result.volumeDryingUp,
          vcpStage: stage.stage,
          pullbackInfo: stage.pullbackInfo,
        });
      } catch (error: any) {
        this.logger.warn({
          action: 'calculate_vcp_stage_error',
          stockCode: result.stockCode,
          error: error.message,
        });
      }
    }

    const sorted = this.sortStocks(stocks);

    const tip = this.generateTip(sorted.length, conditions);

    this.logger.log({
      action: 'filter_early_stage_complete',
      total: sorted.length,
      hasTip: !!tip,
    });

    return {
      stocks: sorted,
      total: sorted.length,
      appliedConditions: conditions,
      tip,
    };
  }

  private validateConditions(conditions: FilterConditions): void {
    const { distFrom52WeekLow, distFrom52WeekHigh, contractionCountMin, contractionCountMax } = conditions;

    const errors: string[] = [];

    if (distFrom52WeekLow < VALIDATION_RULES.distFrom52WeekLow.min || 
        distFrom52WeekLow > VALIDATION_RULES.distFrom52WeekLow.max) {
      errors.push(`distFrom52WeekLow必须在${VALIDATION_RULES.distFrom52WeekLow.min}-${VALIDATION_RULES.distFrom52WeekLow.max}之间`);
    }

    if (distFrom52WeekHigh < VALIDATION_RULES.distFrom52WeekHigh.min || 
        distFrom52WeekHigh > VALIDATION_RULES.distFrom52WeekHigh.max) {
      errors.push(`distFrom52WeekHigh必须在${VALIDATION_RULES.distFrom52WeekHigh.min}-${VALIDATION_RULES.distFrom52WeekHigh.max}之间`);
    }

    if (contractionCountMin < VALIDATION_RULES.contractionCountMin.min || 
        contractionCountMin > VALIDATION_RULES.contractionCountMin.max) {
      errors.push(`contractionCountMin必须在${VALIDATION_RULES.contractionCountMin.min}-${VALIDATION_RULES.contractionCountMin.max}之间`);
    }

    if (contractionCountMax < VALIDATION_RULES.contractionCountMax.min || 
        contractionCountMax > VALIDATION_RULES.contractionCountMax.max) {
      errors.push(`contractionCountMax必须在${VALIDATION_RULES.contractionCountMax.min}-${VALIDATION_RULES.contractionCountMax.max}之间`);
    }

    if (contractionCountMin > contractionCountMax) {
      errors.push('contractionCountMin不能大于contractionCountMax');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  private async getLatestScanDate(): Promise<Date | null> {
    const latest = await this.prisma.vcpScanResult.findFirst({
      orderBy: { scanDate: 'desc' },
      select: { scanDate: true },
    });
    return latest?.scanDate ?? null;
  }

  private async queryVcpStocks(scanDate: Date, conditions: FilterConditions) {
    return await this.prisma.vcpScanResult.findMany({
      where: {
        scanDate,
        trendTemplatePass: true,
        contractionCount: {
          gte: conditions.contractionCountMin,
          lte: conditions.contractionCountMax,
        },
        distFrom52WeekLow: { lte: conditions.distFrom52WeekLow },
        // VCP股票应该接近高点，所以使用 lte（小于等于）而不是 gte
        distFrom52WeekHigh: { lte: conditions.distFrom52WeekHigh },
      },
      include: {
        stock: {
          select: { stockName: true },
        },
      },
    });
  }

  private async calculateVcpStage(stockCode: string): Promise<{
    stage: VcpStage;
    pullbackInfo?: PullbackInfo;
  }> {
    const klines = await this.prisma.kLineData.findMany({
      where: { stockCode, period: 'daily' },
      orderBy: { date: 'desc' },
      take: 300,
      select: { date: true, open: true, high: true, low: true, close: true, volume: true },
    });

    if (klines.length < 30) {
      return { stage: VcpStage.CONTRACTION };
    }

    const sortedKlines = klines.reverse();
    const bars: KLineBar[] = sortedKlines.map((k: { date: Date; open: number; high: number; low: number; close: number; volume: number }) => ({
      date: k.date.toISOString().split('T')[0],
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));

    const analysis = this.vcpAnalyzer.analyze(bars);

    if (!analysis.pullbacks || analysis.pullbacks.length === 0) {
      return { stage: VcpStage.CONTRACTION };
    }

    const lastPullback = analysis.pullbacks[analysis.pullbacks.length - 1];
    const latestBar = bars[bars.length - 1];
    const latestDate = new Date(latestBar.date);
    const lowDate = new Date(lastPullback.lowDate);
    const daysSinceLow = Math.floor((latestDate.getTime() - lowDate.getTime()) / (1000 * 60 * 60 * 24));

    const pullbackInfo: PullbackInfo = {
      durationDays: lastPullback.durationDays,
      pullbackPct: Math.round(lastPullback.pullbackPct * 100) / 100,
      highPrice: lastPullback.highPrice,
      lowPrice: lastPullback.lowPrice,
      highDate: lastPullback.highDate,
      lowDate: lastPullback.lowDate,
      daysSinceLow,
      recoveryPct: lastPullback.lowPrice > 0 
        ? Math.round(((latestBar.close - lastPullback.lowPrice) / lastPullback.lowPrice) * 10000) / 100
        : 0,
    };

    if (daysSinceLow === 0) {
      return { stage: VcpStage.IN_PULLBACK, pullbackInfo };
    } else if (daysSinceLow >= 1 && daysSinceLow <= 20) {
      return { stage: VcpStage.PULLBACK_ENDED, pullbackInfo };
    } else {
      return { stage: VcpStage.CONTRACTION };
    }
  }

  private sortStocks(stocks: EarlyStageStock[]): EarlyStageStock[] {
    const stageOrder: Record<VcpStage, number> = {
      [VcpStage.CONTRACTION]: 0,
      [VcpStage.IN_PULLBACK]: 1,
      [VcpStage.PULLBACK_ENDED]: 2,
    };

    return stocks.sort((a, b) => {
      const stageDiff = stageOrder[a.vcpStage] - stageOrder[b.vcpStage];
      if (stageDiff !== 0) return stageDiff;

      return a.distFrom52WeekLow - b.distFrom52WeekLow;
    });
  }

  private generateTip(total: number, conditions: FilterConditions): ResultTip | undefined {
    if (total === 0) {
      return {
        type: 'error',
        message: '未找到符合条件的股票，建议放宽筛选条件',
        suggestedActions: this.generateQuickActions(conditions, 'error'),
      };
    }

    if (total < 5) {
      return {
        type: 'warning',
        message: `当前条件筛选出${total}只股票，建议放宽筛选条件`,
        suggestedActions: this.generateQuickActions(conditions, 'warning'),
      };
    }

    if (total > 30) {
      return {
        type: 'info',
        message: `当前条件筛选出${total}只股票，建议收紧筛选条件以聚焦优质标的`,
        suggestedActions: this.generateQuickActions(conditions, 'info'),
      };
    }

    return undefined;
  }

  private generateQuickActions(conditions: FilterConditions, tipType: 'error' | 'warning' | 'info'): QuickAction[] {
    const actions: QuickAction[] = [];

    if (tipType === 'error' || tipType === 'warning') {
      const widen5 = Math.min(VALIDATION_RULES.distFrom52WeekLow.max, conditions.distFrom52WeekLow + 5);
      const widen10 = Math.min(VALIDATION_RULES.distFrom52WeekLow.max, conditions.distFrom52WeekLow + 10);

      if (widen5 > conditions.distFrom52WeekLow) {
        actions.push({
          label: '放宽5%',
          adjustments: { distFrom52WeekLow: widen5 },
        });
      }

      if (widen10 > conditions.distFrom52WeekLow) {
        actions.push({
          label: '放宽10%',
          adjustments: { distFrom52WeekLow: widen10 },
        });
      }

      if (tipType === 'error') {
        actions.push({
          label: '使用推荐设置',
          adjustments: {
            distFrom52WeekLow: 40,
            distFrom52WeekHigh: 30,
            contractionCountMin: 3,
            contractionCountMax: 4,
          },
        });
      }
    } else if (tipType === 'info') {
      const tighten5 = Math.max(VALIDATION_RULES.distFrom52WeekLow.min, conditions.distFrom52WeekLow - 5);
      const tighten10 = Math.max(VALIDATION_RULES.distFrom52WeekLow.min, conditions.distFrom52WeekLow - 10);

      if (tighten5 < conditions.distFrom52WeekLow) {
        actions.push({
          label: '收紧5%',
          adjustments: { distFrom52WeekLow: tighten5 },
        });
      }

      if (tighten10 < conditions.distFrom52WeekLow) {
        actions.push({
          label: '收紧10%',
          adjustments: { distFrom52WeekLow: tighten10 },
        });
      }
    }

    return actions;
  }
}
