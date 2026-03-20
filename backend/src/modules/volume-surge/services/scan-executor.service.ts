import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PatternDetectorService } from './pattern-detector.service';
import { MovingAverageService } from './moving-average.service';
import { VolumeSupportCalculatorService } from './volume-support-calculator.service';
import { ScanMode, ScanStatus, StockScanResult, VolumeSupport } from '../../../types/scan.types';
import pLimit from 'p-limit';

@Injectable()
export class ScanExecutorService {
  private readonly logger = new Logger(ScanExecutorService.name);
  private readonly CONCURRENCY_LIMIT = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly patternDetector: PatternDetectorService,
    private readonly movingAverage: MovingAverageService,
    private readonly volumeSupportCalculator: VolumeSupportCalculatorService,
  ) {}

  async executeScan(request: {
    mode: string;
    referenceDate?: string;
    source?: string;
  }): Promise<{ scanId: string; status: string }> {
    const startTime = Date.now();
    const referenceDate = request.referenceDate ? new Date(request.referenceDate) : undefined;

    const scan = await this.prisma.volumeSurgeScan.create({
      data: {
        scanDate: new Date(),
        scanMode: request.mode,
        referenceDate,
        status: 'RUNNING',
        totalStocks: 0,
        matchedStocks: 0,
        createdBy: request.source || 'unknown',
      },
    });

    this.processScanAsync(scan.id, request.mode, referenceDate, startTime);

    return {
      scanId: scan.id,
      status: 'RUNNING',
    };
  }

  private async processScanAsync(
    scanId: string,
    mode: string,
    referenceDate: Date | undefined,
    startTime: number,
  ): Promise<void> {
    try {
      const stocks = await this.prisma.stock.findMany({
        where: { admissionStatus: 'active' },
        select: { stockCode: true, stockName: true },
      });

      this.logger.log(`开始扫描 ${stocks.length} 只股票`);

      await this.prisma.volumeSurgeScan.update({
        where: { id: scanId },
        data: { totalStocks: stocks.length },
      });

      const limit = pLimit(this.CONCURRENCY_LIMIT);
      const results: StockScanResult[] = [];

      const promises = stocks.map((stock) =>
        limit(async () => {
          try {
            const result = await this.scanSingleStock(stock.stockCode, { mode, referenceDate });
            if (result) {
              results.push({ ...result, stockName: stock.stockName });
            }
          } catch (error: any) {
            this.logger.warn(`扫描股票 ${stock.stockCode} 失败: ${error.message}`);
          }
        }),
      );

      await Promise.all(promises);

      await this.saveResults(scanId, results);

      const duration = Date.now() - startTime;

      await this.prisma.volumeSurgeScan.update({
        where: { id: scanId },
        data: {
          status: 'COMPLETED',
          matchedStocks: results.length,
          durationMs: duration,
        },
      });

      this.logger.log(`扫描完成: ${results.length} 只股票符合条件，耗时 ${duration}ms`);
    } catch (error: any) {
      this.logger.error(`扫描失败: ${error.message}`, error.stack);
      await this.prisma.volumeSurgeScan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
    }
  }

  async scanSingleStock(
    stockCode: string,
    options: { mode: string; referenceDate?: Date },
  ): Promise<StockScanResult | null> {
    const pattern = await this.patternDetector.detectPattern(
      stockCode,
      options.mode,
      options.referenceDate,
    );

    if (!pattern) {
      return null;
    }

    const maTrend = await this.movingAverage.getMovingAverageTrend(stockCode);

    if (!maTrend) {
      return null;
    }

    const volumeSupport = await this.volumeSupportCalculator.calculateVolumeSupport(
      stockCode,
      pattern.expansionPoint.date,
    );

    const meetsVolumeCriteria = pattern.expansionPoint.multiplier >= 1.5;
    const meetsMaCriteria = maTrend.isTrendingUp && maTrend.ma50BelowMa150;
    const meetsSupportCriteria = volumeSupport.ratio >= 1.2;
    const meetsAllCriteria = meetsVolumeCriteria && meetsMaCriteria && meetsSupportCriteria;

    return {
      stockCode,
      volumePattern: pattern,
      volumeSupport,
      movingAverages: maTrend,
      criteria: {
        meetsVolumeCriteria,
        meetsMaCriteria,
        meetsSupportCriteria,
        meetsAllCriteria,
      },
    };
  }

  private async saveResults(scanId: string, results: StockScanResult[]): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const scanResults = results.map((r) => ({
      scanId,
      stockCode: r.stockCode,
      contractionStartDate: r.volumePattern.contractionPeriod.startDate,
      contractionEndDate: r.volumePattern.contractionPeriod.endDate,
      contractionAvgVolume: r.volumePattern.contractionPeriod.avgVolume,
      expansionStartDate: r.volumePattern.expansionPoint.date,
      expansionDays: r.volumePattern.expansionPoint.days,
      expansionMultiplier: r.volumePattern.expansionPoint.multiplier,
      upDayAvgVolume: r.volumeSupport.upDayAvgVolume,
      downDayAvgVolume: r.volumeSupport.downDayAvgVolume,
      volumeSupportRatio: r.volumeSupport.ratio,
      ma50Value: r.movingAverages.ma50,
      ma150Value: r.movingAverages.ma150,
      ma50Slope: r.movingAverages.ma50Slope,
      ma50TrendingUp: r.movingAverages.isTrendingUp,
      ma50BelowMa150: r.movingAverages.ma50BelowMa150,
      meetsVolumeCriteria: r.criteria.meetsVolumeCriteria,
      meetsMaCriteria: r.criteria.meetsMaCriteria,
      meetsSupportCriteria: r.criteria.meetsSupportCriteria,
      meetsAllCriteria: r.criteria.meetsAllCriteria,
    }));

    await this.prisma.scanResult.createMany({
      data: scanResults as any,
    });
  }
}
