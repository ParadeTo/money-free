import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { VcpAnalyzerService, KLineBar } from '../services/vcp/vcp-analyzer.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface StockWithStatus {
  stockCode: string;
  stockName: string;
  latestPrice: number;
  priceChangePct: number;
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
  rsRating: number;
  distFrom52WeekHigh: number;
  distFrom52WeekLow: number;
  status: 'contraction' | 'in_pullback' | 'pullback_ended';
  statusText: string;
  pullbackInfo?: {
    durationDays: number;
    pullbackPct: number;
    highPrice: number;
    lowPrice: number;
    highDate: string;
    lowDate: string;
    daysSinceLow: number;
    recoveryPct: number;
  };
}

async function main() {
  const logger = new Logger('Export-VCP-All');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const vcpAnalyzer = app.get(VcpAnalyzerService);

    // 获取最新扫描日期
    const latestResult = await prisma.vcpScanResult.findFirst({
      orderBy: { scanDate: 'desc' },
      select: { scanDate: true },
    });

    if (!latestResult) {
      logger.warn('No VCP scan results found in database');
      return;
    }

    const scanDate = latestResult.scanDate;
    const scanDateStr = scanDate.toISOString().split('T')[0];
    logger.log(`Latest scan date: ${scanDateStr}`);
    logger.log('实时分析所有VCP形态股票...\n');

    // 查询符合 VCP 基础条件的股票
    const results = await prisma.vcpScanResult.findMany({
      where: {
        scanDate,
        trendTemplatePass: true,
        contractionCount: { gte: 3 },
      },
      orderBy: { rsRating: 'desc' },
      include: { stock: { select: { stockName: true } } },
    });

    if (results.length === 0) {
      logger.warn('No VCP pattern stocks found');
      return;
    }

    logger.log(`找到 ${results.length} 只符合VCP基础条件的股票，正在实时分析...\n`);

    const allVcpStocks: StockWithStatus[] = [];

    // 实时分析每只股票的最新K线，判断当前状态
    for (const r of results) {
      const klines = await prisma.kLineData.findMany({
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

      // 实时分析
      const analysis = vcpAnalyzer.analyze(bars);
      const pullbacks = analysis.pullbacks || [];
      const lastBar = bars[bars.length - 1];

      let status: 'contraction' | 'in_pullback' | 'pullback_ended' = 'contraction';
      let statusText = '收缩中';
      let pullbackInfo: StockWithStatus['pullbackInfo'] = undefined;

      // 判断是否有最近的回调
      if (pullbacks.length > 0) {
        const lastPullback = pullbacks[pullbacks.length - 1];
        const lastPullbackLowDate = new Date(lastPullback.lowDate);
        const lastBarDate = new Date(lastBar.date);
        const daysSinceLow = Math.floor((lastBarDate.getTime() - lastPullbackLowDate.getTime()) / (1000 * 60 * 60 * 24));

        // 计算从回调低点到当前的反弹幅度
        const recoveryPct = ((lastBar.close - lastPullback.lowPrice) / lastPullback.lowPrice) * 100;

        pullbackInfo = {
          durationDays: lastPullback.durationDays,
          pullbackPct: lastPullback.pullbackPct,
          highPrice: lastPullback.highPrice,
          lowPrice: lastPullback.lowPrice,
          highDate: lastPullback.highDate,
          lowDate: lastPullback.lowDate,
          daysSinceLow,
          recoveryPct,
        };

        // 如果回调最低点在最近5天内
        if (daysSinceLow <= 5) {
          if (daysSinceLow === 0) {
            status = 'in_pullback';
            statusText = '⚡回调中';
          } else {
            status = 'pullback_ended';
            statusText = `${daysSinceLow}天前`;
          }
        } else if (daysSinceLow <= 20) {
          // 20天内的回调也标记出来
          status = 'pullback_ended';
          statusText = `${daysSinceLow}天前`;
        } else {
          // 回调已经过去很久，认为是收缩中
          status = 'contraction';
          statusText = '收缩中';
        }
      }

      allVcpStocks.push({
        stockCode: r.stockCode,
        stockName: r.stock.stockName,
        latestPrice: r.latestPrice ?? 0,
        priceChangePct: r.priceChangePct ?? 0,
        contractionCount: r.contractionCount ?? 0,
        lastContractionPct: r.lastContractionPct ?? 0,
        volumeDryingUp: r.volumeDryingUp ?? false,
        rsRating: r.rsRating ?? 0,
        distFrom52WeekHigh: r.distFrom52WeekHigh ?? 0,
        distFrom52WeekLow: r.distFrom52WeekLow ?? 0,
        status,
        statusText,
        pullbackInfo,
      });
    }

    // 分类统计并过滤回调幅度小于10%
    const MAX_PULLBACK_PCT = 10;
    const inContraction = allVcpStocks.filter(s => s.status === 'contraction');
    const inPullback = allVcpStocks
      .filter(s => s.status === 'in_pullback' && s.pullbackInfo && s.pullbackInfo.pullbackPct < MAX_PULLBACK_PCT)
      .sort((a, b) => a.pullbackInfo!.pullbackPct - b.pullbackInfo!.pullbackPct);
    const pullbackEnded = allVcpStocks
      .filter(s => s.status === 'pullback_ended' && s.pullbackInfo && s.pullbackInfo.pullbackPct < MAX_PULLBACK_PCT)
      .sort((a, b) => b.rsRating - a.rsRating);
    const contractionSorted = inContraction.sort((a, b) => b.rsRating - a.rsRating);

    const totalFiltered = inPullback.length + pullbackEnded.length + inContraction.length;
    logger.log(`分类完成 (过滤回调>${MAX_PULLBACK_PCT}%): 回调中 ${inPullback.length} 只 | 回调结束 ${pullbackEnded.length} 只 | 收缩中 ${inContraction.length} 只\n`);

    // 生成 Markdown 内容
    const markdown = generateMarkdown(scanDateStr, totalFiltered, inPullback, pullbackEnded, contractionSorted);

    // 输出到文件（按日期分组到子目录）
    const baseDir = path.join(process.cwd(), '..', 'docs', 'vcp', 'daily-reports');
    const outputDir = path.join(baseDir, scanDateStr);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `VCP选股-全览-${scanDateStr}.md`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    logger.log(`✅ 成功导出到: ${outputPath}`);
    logger.log(`📊 统计: 共 ${allVcpStocks.length} 只VCP股票`);
    logger.log(`   ⚡ 回调中: ${inPullback.length} 只`);
    logger.log(`   ✅ 回调结束: ${pullbackEnded.length} 只`);
    logger.log(`   📊 收缩中: ${inContraction.length} 只\n`);

  } catch (error: any) {
    logger.error(`Failed to export VCP results: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

function generateMarkdown(
  scanDate: string,
  totalCount: number,
  inPullback: StockWithStatus[],
  pullbackEnded: StockWithStatus[],
  inContraction: StockWithStatus[]
): string {
  let md = `# VCP 选股全览 - 所有形态股票

**生成日期**: ${scanDate}
**股票数量**: ${totalCount} 只
**数据来源**: 实时K线分析
**筛选条件**: 回调幅度 < 10%

---

## 📊 分类统计

| 分类 | 数量 | 说明 |
|-----|------|------|
| ⚡ 回调中 | ${inPullback.length} 只 | 今天就是回调低点，回调幅度 < 10% |
| ✅ 回调结束 | ${pullbackEnded.length} 只 | 已到达回调低点（1-20天内），回调幅度 < 10% |
| 📊 收缩中 | ${inContraction.length} 只 | 还未进入回调，等待时机 |

---

## ⚡ 正在回调中的股票（${inPullback.length} 只）

**特点**: 今天就是回调低点，回调幅度 < 10%，如果明天企稳并开始反弹，可能是最佳买入点。

### 总览表格

| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌% | RS | 收缩次数 | 回调% | 回调天数 | 反弹% | 成交量萎缩 | 距52周高% |
|-----|---------|---------|--------|-------|-----|---------|-------|---------|-------|-----------|----------|
`;

  inPullback.forEach((stock, idx) => {
    const pb = stock.pullbackInfo!;
    md += `| ${idx + 1} | ${stock.stockCode} | ${stock.stockName} | ${stock.latestPrice.toFixed(2)} | ${stock.priceChangePct.toFixed(2)} | ${stock.rsRating} | ${stock.contractionCount} | ${pb.pullbackPct.toFixed(2)} | ${pb.durationDays} | ${pb.recoveryPct.toFixed(2)} | ${stock.volumeDryingUp ? '是' : '否'} | ${stock.distFrom52WeekHigh.toFixed(2)} |\n`;
  });

  md += `\n### 详细信息\n\n`;

  inPullback.forEach((stock) => {
    const pb = stock.pullbackInfo!;
    md += `#### ${stock.stockCode} - ${stock.stockName}\n\n`;
    md += `- **最新价**: ${stock.latestPrice.toFixed(2)} 元（${stock.priceChangePct >= 0 ? '+' : ''}${stock.priceChangePct.toFixed(2)}%）\n`;
    md += `- **RS评分**: ${stock.rsRating}（相对强度）\n`;
    md += `- **收缩次数**: ${stock.contractionCount} 次，最后收缩 ${stock.lastContractionPct.toFixed(2)}%\n`;
    md += `- **回调信息**: ${pb.highDate} (${pb.highPrice.toFixed(2)}) → ${pb.lowDate} (${pb.lowPrice.toFixed(2)})\n`;
    md += `- **回调幅度**: ${pb.pullbackPct.toFixed(2)}%，持续 ${pb.durationDays} 天\n`;
    md += `- **当前反弹**: ${pb.recoveryPct.toFixed(2)}%（从低点反弹）\n`;
    md += `- **成交量萎缩**: ${stock.volumeDryingUp ? '✅ 是' : '❌ 否'}\n`;
    md += `- **距52周高**: ${stock.distFrom52WeekHigh.toFixed(2)}%\n`;
    md += `- **距52周低**: ${stock.distFrom52WeekLow.toFixed(2)}%\n`;
    md += `- **当前状态**: ⚡ **回调中（买点观察）**\n\n`;
  });

  md += `---

## ✅ 回调刚结束的股票（${pullbackEnded.length} 只）

**特点**: 已经到达回调低点并开始反弹（回调幅度 < 10%），确认趋势后可考虑追涨。

### 总览表格（按RS评分排序）

| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌% | RS | 收缩次数 | 回调% | 回调天数 | 反弹% | 距低点 | 距52周高% |
|-----|---------|---------|--------|-------|-----|---------|-------|---------|-------|--------|----------|
`;

  pullbackEnded.forEach((stock, idx) => {
    const pb = stock.pullbackInfo!;
    md += `| ${idx + 1} | ${stock.stockCode} | ${stock.stockName} | ${stock.latestPrice.toFixed(2)} | ${stock.priceChangePct.toFixed(2)} | ${stock.rsRating} | ${stock.contractionCount} | ${pb.pullbackPct.toFixed(2)} | ${pb.durationDays} | ${pb.recoveryPct.toFixed(2)} | ${pb.daysSinceLow}天前 | ${stock.distFrom52WeekHigh.toFixed(2)} |\n`;
  });

  md += `\n### 高RS评分股票详情（RS ≥ 85）\n\n`;

  pullbackEnded.filter(s => s.rsRating >= 85).forEach((stock) => {
    const pb = stock.pullbackInfo!;
    md += `#### ${stock.stockCode} - ${stock.stockName} (RS: ${stock.rsRating})\n\n`;
    md += `- **最新价**: ${stock.latestPrice.toFixed(2)} 元（${stock.priceChangePct >= 0 ? '+' : ''}${stock.priceChangePct.toFixed(2)}%）\n`;
    md += `- **收缩次数**: ${stock.contractionCount} 次，最后收缩 ${stock.lastContractionPct.toFixed(2)}%\n`;
    md += `- **回调信息**: 回调 ${pb.pullbackPct.toFixed(2)}%，持续 ${pb.durationDays} 天\n`;
    md += `- **反弹表现**: 从低点反弹 ${pb.recoveryPct.toFixed(2)}%（${pb.daysSinceLow} 天前到达低点）\n`;
    md += `- **成交量萎缩**: ${stock.volumeDryingUp ? '✅ 是' : '❌ 否'}\n`;
    md += `- **距52周高**: ${stock.distFrom52WeekHigh.toFixed(2)}%\n\n`;
  });

  md += `---

## 📊 收缩中的股票（${inContraction.length} 只）

**特点**: 还未进入回调或上次回调已经很久，当前处于价格收缩整理中，需要等待回调机会。

### 总览表格（按RS评分排序）

| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌% | RS | 收缩次数 | 最后收缩% | 成交量萎缩 | 距52周高% |
|-----|---------|---------|--------|-------|-----|---------|----------|-----------|----------|
`;

  inContraction.forEach((stock, idx) => {
    md += `| ${idx + 1} | ${stock.stockCode} | ${stock.stockName} | ${stock.latestPrice.toFixed(2)} | ${stock.priceChangePct.toFixed(2)} | ${stock.rsRating} | ${stock.contractionCount} | ${stock.lastContractionPct.toFixed(2)} | ${stock.volumeDryingUp ? '是' : '否'} | ${stock.distFrom52WeekHigh.toFixed(2)} |\n`;
  });

  md += `\n### 详细信息\n\n`;

  inContraction.forEach((stock) => {
    md += `#### ${stock.stockCode} - ${stock.stockName}\n\n`;
    md += `- **最新价**: ${stock.latestPrice.toFixed(2)} 元（${stock.priceChangePct >= 0 ? '+' : ''}${stock.priceChangePct.toFixed(2)}%）\n`;
    md += `- **RS评分**: ${stock.rsRating}\n`;
    md += `- **收缩次数**: ${stock.contractionCount} 次，最后收缩 ${stock.lastContractionPct.toFixed(2)}%\n`;
    md += `- **成交量萎缩**: ${stock.volumeDryingUp ? '✅ 是' : '❌ 否'}\n`;
    md += `- **距52周高**: ${stock.distFrom52WeekHigh.toFixed(2)}%\n`;
    md += `- **距52周低**: ${stock.distFrom52WeekLow.toFixed(2)}%\n`;
    md += `- **当前状态**: 📊 收缩中（等待回调买点）\n\n`;
  });

  md += `---

## 💡 投资策略建议

### 1. 立即关注（⚡ 回调中的股票）

这些股票今天就是回调低点，观察明天是否企稳：

`;

  const topPullback = inPullback.slice(0, 5);
  topPullback.forEach((stock, idx) => {
    md += `${idx + 1}. **${stock.stockName}** (${stock.stockCode}) - RS ${stock.rsRating}, 回调 ${stock.pullbackInfo!.pullbackPct.toFixed(2)}%\n`;
  });

  md += `\n### 2. 择机介入（✅ 回调结束的股票）

已经开始反弹，确认趋势后可追涨：

`;

  const topEnded = pullbackEnded.filter(s => s.rsRating >= 90).slice(0, 5);
  topEnded.forEach((stock, idx) => {
    md += `${idx + 1}. **${stock.stockName}** (${stock.stockCode}) - RS ${stock.rsRating}, 反弹 ${stock.pullbackInfo!.recoveryPct.toFixed(2)}%\n`;
  });

  md += `\n### 3. 耐心等待（📊 收缩中的股票）

等待这些股票进入回调后再介入：

`;

  const topContraction = inContraction.slice(0, 5);
  topContraction.forEach((stock, idx) => {
    md += `${idx + 1}. **${stock.stockName}** (${stock.stockCode}) - RS ${stock.rsRating}\n`;
  });

  md += `\n---

## 📖 术语说明

- **VCP形态**: Volatility Contraction Pattern，波动性收缩形态
- **RS评分**: Relative Strength，相对强度评分（0-100），越高越强
- **收缩**: 价格波动幅度逐渐减小的整理过程
- **回调**: 上升趋势中的价格短期回落
- **成交量萎缩**: 收缩过程中成交量递减，表示抛压减轻
- **距52周高/低**: 当前价格相对于过去52周最高/最低价的百分比

---

## ⚠️ 风险提示

1. **市场风险**: 整体市场波动可能影响个股表现
2. **技术面局限**: VCP形态是技术分析工具，需结合基本面研判
3. **假突破风险**: 部分股票可能出现假突破后回落
4. **建议**: 
   - 结合公司基本面分析
   - 设置合理止损位
   - 控制仓位，分散投资
   - 关注行业政策和宏观经济

---

*本报告由 money-free 系统自动生成，数据来源于实时K线分析*  
*生成时间: ${scanDate}*
`;

  return md;
}

main();
