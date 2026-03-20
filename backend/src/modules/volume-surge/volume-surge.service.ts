import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScanExecutorService } from './services/scan-executor.service';
import { ExportService } from './services/export.service';
import { ComparisonService } from './services/comparison.service';
import { ScanMode, ScanStatus, ScanSummary } from '../../types/scan.types';

@Injectable()
export class VolumeSurgeService {
  private readonly logger = new Logger(VolumeSurgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanExecutor: ScanExecutorService,
    private readonly exportService: ExportService,
    private readonly comparisonService: ComparisonService,
  ) {}

  async scan(request: { mode: string; referenceDate?: string; source?: string }) {
    this.logger.log(`启动扫描 - 模式: ${request.mode}`);

    if (request.mode === ScanMode.MANUAL && !request.referenceDate) {
      throw new BadRequestException('手动模式需要提供参考日期');
    }

    if (request.referenceDate) {
      const refDate = new Date(request.referenceDate);
      if (refDate > new Date()) {
        throw new BadRequestException('参考日期不能是未来日期');
      }
    }

    return await this.scanExecutor.executeScan(request);
  }

  async getScanStatus(scanId: string): Promise<ScanSummary | null> {
    this.logger.log(`查询扫描状态: ${scanId}`);

    const scan = await this.prisma.volumeSurgeScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      return null;
    }

    return {
      scanId: scan.id,
      scanDate: scan.scanDate,
      scanMode: scan.scanMode as ScanMode,
      referenceDate: scan.referenceDate || undefined,
      status: scan.status as ScanStatus,
      totalStocks: scan.totalStocks,
      matchedStocks: scan.matchedStocks,
      unmatchedStocks: scan.totalStocks - scan.matchedStocks,
      durationMs: scan.durationMs || undefined,
      createdBy: scan.createdBy || undefined,
    };
  }

  async getScanResults(
    scanId: string,
    options: {
      filter?: 'all' | 'matched' | 'unmatched';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    this.logger.log(`查询扫描结果: ${scanId}`);

    const scan = await this.prisma.volumeSurgeScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException('扫描不存在');
    }

    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { scanId };
    if (options.filter === 'matched') {
      where.meetsAllCriteria = true;
    } else if (options.filter === 'unmatched') {
      where.meetsAllCriteria = false;
    }

    const [results, total] = await Promise.all([
      this.prisma.scanResult.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [options.sortBy || 'volumeSupportRatio']: options.sortOrder || 'desc' },
        include: {
          stock: {
            select: { stockName: true },
          },
        },
      }),
      this.prisma.scanResult.count({ where }),
    ]);

    return {
      results: results.map((r) => ({
        resultId: r.id,
        scanId: r.scanId,
        stockCode: r.stockCode,
        stockName: r.stock.stockName,
        volumePattern: {
          contractionPeriod: {
            startDate: r.contractionStartDate,
            endDate: r.contractionEndDate,
            avgVolume: r.contractionAvgVolume,
          },
          expansionPoint: {
            date: r.expansionStartDate,
            volume: r.upDayAvgVolume,
            multiplier: r.expansionMultiplier,
            days: r.expansionDays,
          },
        },
        volumeSupport: {
          upDayAvgVolume: r.upDayAvgVolume,
          downDayAvgVolume: r.downDayAvgVolume,
          ratio: r.volumeSupportRatio,
        },
        movingAverages: {
          ma50: r.ma50Value,
          ma150: r.ma150Value,
          ma50Slope: r.ma50Slope,
          isTrendingUp: r.ma50TrendingUp,
          ma50BelowMa150: r.ma50BelowMa150,
        },
        criteria: {
          meetsVolumeCriteria: r.meetsVolumeCriteria,
          meetsMaCriteria: r.meetsMaCriteria,
          meetsSupportCriteria: r.meetsSupportCriteria,
          meetsAllCriteria: r.meetsAllCriteria,
        },
        createdAt: r.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalStocks: scan.totalStocks,
        matchedStocks: scan.matchedStocks,
        unmatchedStocks: scan.totalStocks - scan.matchedStocks,
      },
    };
  }

  async getScans(options: { page?: number; limit?: number; status?: string; mode?: string }) {
    this.logger.log('查询扫描列表');

    const page = options.page || 1;
    const limit = Math.min(options.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) where.status = options.status.toUpperCase();
    if (options.mode) where.scanMode = options.mode.toUpperCase();

    const [scans, total] = await Promise.all([
      this.prisma.volumeSurgeScan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scanDate: 'desc' },
      }),
      this.prisma.volumeSurgeScan.count({ where }),
    ]);

    return {
      scans: scans.map((s) => ({
        scanId: s.id,
        scanDate: s.scanDate,
        scanMode: s.scanMode as ScanMode,
        referenceDate: s.referenceDate || undefined,
        status: s.status as ScanStatus,
        totalStocks: s.totalStocks,
        matchedStocks: s.matchedStocks,
        unmatchedStocks: s.totalStocks - s.matchedStocks,
        durationMs: s.durationMs || undefined,
        createdBy: s.createdBy || undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelScan(scanId: string) {
    this.logger.log(`取消扫描: ${scanId}`);

    const scan = await this.prisma.volumeSurgeScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException('扫描不存在');
    }

    if (scan.status !== 'RUNNING') {
      throw new BadRequestException(`无法取消状态为 ${scan.status} 的扫描`);
    }

    await this.prisma.volumeSurgeScan.update({
      where: { id: scanId },
      data: { status: 'CANCELLED' },
    });

    return { scanId, status: ScanStatus.CANCELLED };
  }

  async exportResults(
    scanId: string,
    format: 'csv' | 'markdown',
    filter: 'all' | 'matched' = 'matched',
  ) {
    this.logger.log(`导出扫描结果: ${scanId}, 格式: ${format}`);

    if (format === 'csv') {
      return await this.exportService.exportToCSV(scanId, filter);
    } else if (format === 'markdown') {
      return await this.exportService.exportToMarkdown(scanId, filter);
    }

    throw new BadRequestException('不支持的导出格式');
  }

  async compareScans(scanId1: string, scanId2: string) {
    this.logger.log(`对比扫描: ${scanId1} vs ${scanId2}`);
    return await this.comparisonService.compareScans(scanId1, scanId2);
  }
}
