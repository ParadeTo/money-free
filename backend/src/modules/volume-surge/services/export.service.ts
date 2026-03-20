import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportToCSV(scanId: string, filter: 'all' | 'matched' = 'matched'): Promise<string> {
    const scan = await this.prisma.volumeSurgeScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException('扫描不存在');
    }

    const where: any = { scanId };
    if (filter === 'matched') {
      where.meetsAllCriteria = true;
    }

    const results = await this.prisma.scanResult.findMany({
      where,
      include: {
        stock: { select: { stockName: true } },
      },
      orderBy: { volumeSupportRatio: 'desc' },
    });

    const headers = [
      'Stock Code',
      'Stock Name',
      'Contraction Start',
      'Contraction End',
      'Expansion Start',
      'Expansion Multiplier',
      'Up Day Avg Volume',
      'Down Day Avg Volume',
      'Volume Support Ratio',
      'MA50',
      'MA150',
      'MA50 Slope',
      'Meets All Criteria',
    ];

    const rows = results.map((r) => [
      r.stockCode,
      r.stock.stockName,
      this.formatDate(r.contractionStartDate),
      this.formatDate(r.contractionEndDate),
      this.formatDate(r.expansionStartDate),
      r.expansionMultiplier.toFixed(2),
      r.upDayAvgVolume.toFixed(0),
      r.downDayAvgVolume.toFixed(0),
      r.volumeSupportRatio.toFixed(2),
      r.ma50Value.toFixed(2),
      r.ma150Value.toFixed(2),
      r.ma50Slope.toFixed(4),
      r.meetsAllCriteria ? 'true' : 'false',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csvContent;
  }

  async exportToMarkdown(scanId: string, filter: 'all' | 'matched' = 'matched'): Promise<string> {
    const scan = await this.prisma.volumeSurgeScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException('扫描不存在');
    }

    const where: any = { scanId };
    if (filter === 'matched') {
      where.meetsAllCriteria = true;
    }

    const results = await this.prisma.scanResult.findMany({
      where,
      include: {
        stock: { select: { stockName: true } },
      },
      orderBy: { volumeSupportRatio: 'desc' },
    });

    const scanDateStr = this.formatDate(scan.scanDate);
    const durationSec = scan.durationMs ? (scan.durationMs / 1000).toFixed(1) : 'N/A';

    let markdown = `# Volume Surge Scan Results - ${scanDateStr}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Scan Date**: ${scanDateStr}\n`;
    markdown += `- **Scan Mode**: ${scan.scanMode}\n`;
    if (scan.referenceDate) {
      markdown += `- **Reference Date**: ${this.formatDate(scan.referenceDate)}\n`;
    }
    markdown += `- **Total Stocks Scanned**: ${scan.totalStocks.toLocaleString()}\n`;
    markdown += `- **Matched Stocks**: ${scan.matchedStocks}\n`;
    markdown += `- **Scan Duration**: ${durationSec}s\n\n`;

    markdown += `## Matched Stocks\n\n`;

    if (results.length === 0) {
      markdown += `*No stocks matched the criteria.*\n`;
      return markdown;
    }

    results.forEach((r, index) => {
      markdown += `### ${index + 1}. ${r.stockCode} - ${r.stock.stockName}\n\n`;

      markdown += `**Volume Pattern**:\n`;
      markdown += `- Contraction Period: ${this.formatDate(r.contractionStartDate)} to ${this.formatDate(r.contractionEndDate)}\n`;
      markdown += `- Contraction Avg Volume: ${r.contractionAvgVolume.toLocaleString()}\n`;
      markdown += `- Expansion Start: ${this.formatDate(r.expansionStartDate)}\n`;
      markdown += `- Expansion Multiplier: ${r.expansionMultiplier.toFixed(2)}x\n\n`;

      markdown += `**Volume Support**:\n`;
      markdown += `- Up Day Avg Volume: ${r.upDayAvgVolume.toLocaleString()}\n`;
      markdown += `- Down Day Avg Volume: ${r.downDayAvgVolume.toLocaleString()}\n`;
      markdown += `- Support Ratio: ${r.volumeSupportRatio.toFixed(2)}\n\n`;

      markdown += `**Moving Averages**:\n`;
      markdown += `- MA50: ${r.ma50Value.toFixed(2)} ${r.ma50TrendingUp ? '(Trending Up ✓)' : '(Flat/Down)'}\n`;
      markdown += `- MA150: ${r.ma150Value.toFixed(2)}\n`;
      markdown += `- MA50 Below MA150: ${r.ma50BelowMa150 ? 'Yes ✓' : 'No'}\n\n`;

      markdown += `**Status**: ${r.meetsAllCriteria ? '✅ Meets All Criteria' : '⚠️ Partial Match'}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
