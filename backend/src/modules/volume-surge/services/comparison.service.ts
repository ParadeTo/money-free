import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompareResult, PersistentStock, ScanSummary } from '../../../types/scan.types';

@Injectable()
export class ComparisonService {
  private readonly logger = new Logger(ComparisonService.name);

  constructor(private readonly prisma: PrismaService) {}

  async compareScans(scanId1: string, scanId2: string): Promise<CompareResult> {
    const [scan1, scan2] = await Promise.all([
      this.prisma.volumeSurgeScan.findUnique({ where: { id: scanId1 } }),
      this.prisma.volumeSurgeScan.findUnique({ where: { id: scanId2 } }),
    ]);

    if (!scan1 || !scan2) {
      throw new NotFoundException('一个或多个扫描不存在');
    }

    const persistentStocksRaw = await this.prisma.$queryRaw<any[]>`
      SELECT 
        r1.stock_code,
        s.stock_name as name,
        r1.volume_support_ratio as ratio_scan1,
        r2.volume_support_ratio as ratio_scan2
      FROM scan_results r1
      JOIN scan_results r2 ON r1.stock_code = r2.stock_code
      JOIN stocks s ON r1.stock_code = s.stock_code
      WHERE r1.scan_id = ${scanId1}
        AND r2.scan_id = ${scanId2}
        AND r1.meets_all_criteria = 1
        AND r2.meets_all_criteria = 1
      ORDER BY r2.volume_support_ratio DESC
    `;

    const persistentStocks: PersistentStock[] = persistentStocksRaw.map((row) => ({
      stockCode: row.stock_code,
      stockName: row.name,
      volumeSupportRatio1: row.ratio_scan1,
      volumeSupportRatio2: row.ratio_scan2,
      trend: this.calculateTrend(row.ratio_scan1, row.ratio_scan2),
    }));

    const [results1, results2] = await Promise.all([
      this.prisma.scanResult.count({
        where: { scanId: scanId1, meetsAllCriteria: true },
      }),
      this.prisma.scanResult.count({
        where: { scanId: scanId2, meetsAllCriteria: true },
      }),
    ]);

    const persistentCount = persistentStocks.length;
    const onlyInScan1 = results1 - persistentCount;
    const onlyInScan2 = results2 - persistentCount;

    return {
      scan1: this.toScanSummary(scan1),
      scan2: this.toScanSummary(scan2),
      persistentStocks,
      summary: {
        persistentCount,
        onlyInScan1,
        onlyInScan2,
      },
    };
  }

  calculateTrend(ratio1: number, ratio2: number): 'improving' | 'declining' | 'stable' {
    const change = ((ratio2 - ratio1) / ratio1) * 100;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  private toScanSummary(scan: any): ScanSummary {
    return {
      scanId: scan.id,
      scanDate: scan.scanDate,
      scanMode: scan.scanMode,
      referenceDate: scan.referenceDate || undefined,
      status: scan.status,
      totalStocks: scan.totalStocks,
      matchedStocks: scan.matchedStocks,
      unmatchedStocks: scan.totalStocks - scan.matchedStocks,
      durationMs: scan.durationMs || undefined,
      createdBy: scan.createdBy || undefined,
    };
  }
}
