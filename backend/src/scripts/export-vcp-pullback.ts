import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { VcpAnalyzerService, KLineBar, PullbackResult } from '../services/vcp/vcp-analyzer.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface StockWithPullback {
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
  lastPullback: PullbackResult;
  daysSinceLow: number;
  recoveryPct: number;
  distFromHigh: number;
  sortKey: number;
}

interface StockWithoutPullback {
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
  sortKey: number;
}

async function main() {
  const logger = new Logger('VCP-Export');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const vcpAnalyzer = app.get(VcpAnalyzerService);

    const latestResult = await prisma.vcpScanResult.findFirst({
      orderBy: { scanDate: 'desc' },
      select: { scanDate: true },
    });

    if (!latestResult) {
      logger.warn('No VCP scan results found in database');
      return;
    }

    const scanDate = latestResult.scanDate;
    const dateStr = scanDate.toISOString().split('T')[0];
    logger.log(`Latest scan date: ${dateStr}`);
    logger.log('实时分析最新K线数据，筛选优质VCP股票...\n');

    const results = await prisma.vcpScanResult.findMany({
      where: {
        scanDate,
        trendTemplatePass: true,
        contractionCount: { gte: 3 },
      },
      orderBy: { lastContractionPct: 'asc' },
      include: { stock: { select: { stockName: true } } },
    });

    if (results.length === 0) {
      logger.warn('No VCP pattern stocks found');
      return;
    }

    const stocksWithPullback: StockWithPullback[] = [];
    const stocksWithoutPullback: StockWithoutPullback[] = [];

    logger.log(`分析 ${results.length} 只股票的回调状态...`);
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

      const analysis = vcpAnalyzer.analyze(bars);
      const pullbacks = analysis.pullbacks || [];
      const lastBar = bars[bars.length - 1];

      if (pullbacks.length > 0) {
        const lastPullback = pullbacks[pullbacks.length - 1];
        
        const lastPullbackLowDate = new Date(lastPullback.lowDate);
        const lastBarDate = new Date(lastBar.date);
        const daysSinceLow = Math.floor((lastBarDate.getTime() - lastPullbackLowDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLow <= 5 && lastPullback.pullbackPct < 10) {
          const recoveryPct = ((lastBar.close - lastPullback.lowPrice) / lastPullback.lowPrice * 100);
          const distFromHigh = ((lastBar.close - lastPullback.highPrice) / lastPullback.highPrice * 100);
          
          stocksWithPullback.push({
            stockCode: r.stockCode,
            stockName: r.stock.stockName,
            latestPrice: r.latestPrice,
            priceChangePct: r.priceChangePct,
            contractionCount: r.contractionCount,
            lastContractionPct: r.lastContractionPct,
            volumeDryingUp: r.volumeDryingUp,
            rsRating: r.rsRating,
            distFrom52WeekHigh: r.distFrom52WeekHigh,
            distFrom52WeekLow: r.distFrom52WeekLow,
            lastPullback,
            daysSinceLow,
            recoveryPct,
            distFromHigh,
            sortKey: lastPullback.pullbackPct,
          });
        }
      } else {
        if (r.lastContractionPct < 10) {
          stocksWithoutPullback.push({
            stockCode: r.stockCode,
            stockName: r.stock.stockName,
            latestPrice: r.latestPrice,
            priceChangePct: r.priceChangePct,
            contractionCount: r.contractionCount,
            lastContractionPct: r.lastContractionPct,
            volumeDryingUp: r.volumeDryingUp,
            rsRating: r.rsRating,
            distFrom52WeekHigh: r.distFrom52WeekHigh,
            distFrom52WeekLow: r.distFrom52WeekLow,
            sortKey: r.lastContractionPct,
          });
        }
      }
    }

    let finalStocks: (StockWithPullback | StockWithoutPullback)[] = [];
    let filterType: 'pullback' | 'contraction' = 'pullback';

    if (stocksWithPullback.length > 0) {
      finalStocks = stocksWithPullback.sort((a, b) => a.sortKey - b.sortKey);
      filterType = 'pullback';
      logger.log(`找到 ${finalStocks.length} 只回调幅度 < 10% 的股票\n`);
    } else if (stocksWithoutPullback.length > 0) {
      finalStocks = stocksWithoutPullback.sort((a, b) => a.sortKey - b.sortKey);
      filterType = 'contraction';
      logger.log(`未找到回调幅度 < 10% 的股票`);
      logger.log(`找到 ${finalStocks.length} 只收缩幅度 < 10% 的股票（无回调数据）\n`);
    } else {
      logger.warn('没有符合条件的股票（回调幅度或收缩幅度 < 10%）');
      return;
    }

    const outputDir = path.join(process.cwd(), '..', 'docs', 'vcp', 'daily-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = filterType === 'pullback' 
      ? `VCP选股-浅回调-${dateStr}.md`
      : `VCP选股-浅收缩-${dateStr}.md`;
    const filepath = path.join(outputDir, filename);

    let markdown = filterType === 'pullback'
      ? `# VCP 选股列表 - 浅回调股票（回调幅度 < 10%）\n\n`
      : `# VCP 选股列表 - 浅收缩股票（收缩幅度 < 10%，无回调数据）\n\n`;
    
    markdown += `**生成日期**: ${dateStr}\n`;
    markdown += `**股票数量**: ${finalStocks.length} 只\n`;
    markdown += `**筛选类型**: ${filterType === 'pullback' ? '回调幅度筛选' : '收缩幅度筛选'}\n\n`;
    markdown += `## 筛选条件\n\n`;
    markdown += `- ✅ 通过趋势模板\n`;
    markdown += `- ✅ 至少 3 次收缩\n`;
    
    if (filterType === 'pullback') {
      markdown += `- ✅ 最近 5 天内到达回调最低点\n`;
      markdown += `- ✅ 回调幅度 < 10%（按幅度从小到大排序）\n\n`;
    } else {
      markdown += `- ✅ 收缩幅度 < 10%（按幅度从小到大排序）\n`;
      markdown += `- ℹ️ 无回调数据或回调不符合条件\n\n`;
    }
    
    markdown += `---\n\n`;
    markdown += `## 📊 股票列表\n\n`;
    
    if (filterType === 'pullback') {
      markdown += `| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌幅% | 回调幅度% | 回调天数 | 距最低点 | 反弹% | 收缩次数 | RS评分 | 成交量萎缩 | 距52周高% |\n`;
      markdown += `|-----|---------|---------|--------|---------|----------|---------|---------|-------|---------|--------|-----------|----------|\n`;

      (finalStocks as StockWithPullback[]).forEach((stock, index) => {
        const status = stock.daysSinceLow === 0 ? '⚡回调中' : `${stock.daysSinceLow}天前`;
        markdown += `| ${index + 1} | ${stock.stockCode} | ${stock.stockName} | ${stock.latestPrice.toFixed(2)} | ${stock.priceChangePct.toFixed(2)} | ${stock.lastPullback.pullbackPct.toFixed(2)} | ${stock.lastPullback.durationDays} | ${status} | ${stock.recoveryPct.toFixed(2)} | ${stock.contractionCount} | ${stock.rsRating.toFixed(0)} | ${stock.volumeDryingUp ? '是' : '否'} | ${stock.distFrom52WeekHigh.toFixed(2)} |\n`;
      });
    } else {
      markdown += `| 排名 | 股票代码 | 股票名称 | 最新价 | 涨跌幅% | 收缩幅度% | 收缩次数 | RS评分 | 成交量萎缩 | 距52周高% |\n`;
      markdown += `|-----|---------|---------|--------|---------|----------|---------|--------|-----------|----------|\n`;

      (finalStocks as StockWithoutPullback[]).forEach((stock, index) => {
        markdown += `| ${index + 1} | ${stock.stockCode} | ${stock.stockName} | ${stock.latestPrice.toFixed(2)} | ${stock.priceChangePct.toFixed(2)} | ${stock.lastContractionPct.toFixed(2)} | ${stock.contractionCount} | ${stock.rsRating.toFixed(0)} | ${stock.volumeDryingUp ? '是' : '否'} | ${stock.distFrom52WeekHigh.toFixed(2)} |\n`;
      });
    }

    markdown += `\n---\n\n`;
    markdown += `## 📋 详细信息\n\n`;
    
    if (filterType === 'pullback') {
      for (const stock of (finalStocks as StockWithPullback[])) {
        markdown += `### ${stock.stockCode} - ${stock.stockName}\n\n`;
        markdown += `- **最新价**: ${stock.latestPrice.toFixed(2)} 元（${stock.priceChangePct.toFixed(2)}%）\n`;
        markdown += `- **收缩次数**: ${stock.contractionCount} 次，最后收缩 ${stock.lastContractionPct.toFixed(2)}%\n`;
        markdown += `- **RS评分**: ${stock.rsRating.toFixed(0)}\n`;
        markdown += `- **成交量萎缩**: ${stock.volumeDryingUp ? '是' : '否'}\n`;
        markdown += `- **最新回调**: ${stock.lastPullback.highDate} (${stock.lastPullback.highPrice.toFixed(2)}) → ${stock.lastPullback.lowDate} (${stock.lastPullback.lowPrice.toFixed(2)})\n`;
        markdown += `- **回调幅度**: ${stock.lastPullback.pullbackPct.toFixed(2)}%，持续 ${stock.lastPullback.durationDays} 天\n`;
        markdown += `- **当前状态**: ${stock.daysSinceLow === 0 ? '⚡ 回调中' : `回调结束 ${stock.daysSinceLow} 天，已反弹 ${stock.recoveryPct.toFixed(2)}%`}\n`;
        markdown += `- **距52周高**: ${stock.distFrom52WeekHigh.toFixed(2)}%\n`;
        markdown += `- **距52周低**: ${stock.distFrom52WeekLow.toFixed(2)}%\n\n`;
      }
    } else {
      for (const stock of (finalStocks as StockWithoutPullback[])) {
        markdown += `### ${stock.stockCode} - ${stock.stockName}\n\n`;
        markdown += `- **最新价**: ${stock.latestPrice.toFixed(2)} 元（${stock.priceChangePct.toFixed(2)}%）\n`;
        markdown += `- **收缩次数**: ${stock.contractionCount} 次，最后收缩 ${stock.lastContractionPct.toFixed(2)}%\n`;
        markdown += `- **RS评分**: ${stock.rsRating.toFixed(0)}\n`;
        markdown += `- **成交量萎缩**: ${stock.volumeDryingUp ? '是' : '否'}\n`;
        markdown += `- **距52周高**: ${stock.distFrom52WeekHigh.toFixed(2)}%\n`;
        markdown += `- **距52周低**: ${stock.distFrom52WeekLow.toFixed(2)}%\n\n`;
      }
    }

    markdown += `---\n\n`;
    markdown += `## 📖 使用说明\n\n`;
    markdown += `### 筛选逻辑\n\n`;
    markdown += `本报告采用两级筛选策略：\n\n`;
    markdown += `1. **第一优先级**：筛选回调幅度 < 10% 的股票（处于上升趋势中的浅回调）\n`;
    markdown += `2. **第二优先级**：如果没有符合条件的回调股票，则筛选收缩幅度 < 10% 的股票\n\n`;
    markdown += `当前使用：**${filterType === 'pullback' ? '回调幅度筛选' : '收缩幅度筛选'}**\n\n`;
    markdown += `### VCP 形态特征\n\n`;
    markdown += `1. **收缩次数**: 至少 3 次价格收缩\n`;
    markdown += `2. **收缩幅度递减**: 后续收缩幅度应小于前面的收缩\n`;
    markdown += `3. **成交量萎缩**: 收缩过程中成交量逐渐减少\n`;
    markdown += `4. **回调**: 上涨趋势中的健康回调\n\n`;
    markdown += `### 关注要点\n\n`;
    
    if (filterType === 'pullback') {
      markdown += `- **浅回调优势**: 回调幅度 < 10% 通常意味着股票强势，上涨动能充足\n`;
      markdown += `- **正在回调中**: 等待回调结束的买入时机\n`;
      markdown += `- **刚结束回调**: 可能是较好的介入时机\n`;
    } else {
      markdown += `- **浅收缩优势**: 收缩幅度 < 10% 通常意味着调整充分但不过度\n`;
      markdown += `- **等待回调**: 这些股票尚未出现明显回调，可等待更好的买入时机\n`;
    }
    
    markdown += `- **高 RS 评分**: 相对强度高的股票更值得关注\n`;
    markdown += `- **成交量萎缩**: 收缩过程中成交量萎缩是好的信号\n`;
    markdown += `- **距52周高**: 越接近 52 周高点，说明强势越明显\n\n`;
    markdown += `---\n\n`;
    markdown += `*本报告由 money-free 系统自动生成*\n`;

    fs.writeFileSync(filepath, markdown, 'utf-8');

    logger.log(`✅ 选股列表已导出到: ${filepath}`);
    logger.log(`📄 文件名: ${filename}\n`);

    console.log('\n' + '='.repeat(120));
    console.log(`VCP 选股列表 - ${dateStr}`);
    console.log(`筛选类型: ${filterType === 'pullback' ? '回调幅度 < 10%' : '收缩幅度 < 10%（无回调）'}`);
    console.log(`股票数量: ${finalStocks.length} 只（按幅度从小到大排序）`);
    console.log('='.repeat(120) + '\n');

    if (filterType === 'pullback') {
      console.log('排名 | 股票代码 | 股票名称       | 回调幅度% | 回调天数 | 距最低点   | 反弹%    | RS评分 | 收缩% | 距52周高%');
      console.log('-'.repeat(120));
      
      (finalStocks as StockWithPullback[]).forEach((s, i) => {
        const status = s.daysSinceLow === 0 ? '⚡回调中' : `${s.daysSinceLow}天前`.padEnd(8);
        console.log(
          `${(i + 1).toString().padStart(4)} | ${s.stockCode} | ${s.stockName.padEnd(10)} | ${s.lastPullback.pullbackPct.toFixed(2).padStart(9)} | ${s.lastPullback.durationDays.toString().padStart(8)} | ${status} | ${s.recoveryPct.toFixed(2).padStart(8)} | ${s.rsRating.toFixed(0).padStart(6)} | ${s.lastContractionPct.toFixed(2).padStart(5)} | ${s.distFrom52WeekHigh.toFixed(2).padStart(9)}`
        );
      });
    } else {
      console.log('排名 | 股票代码 | 股票名称       | 收缩幅度% | 收缩次数 | RS评分 | 成交量萎缩 | 最新价  | 涨跌幅% | 距52周高%');
      console.log('-'.repeat(120));
      
      (finalStocks as StockWithoutPullback[]).forEach((s, i) => {
        console.log(
          `${(i + 1).toString().padStart(4)} | ${s.stockCode} | ${s.stockName.padEnd(10)} | ${s.lastContractionPct.toFixed(2).padStart(9)} | ${s.contractionCount.toString().padStart(8)} | ${s.rsRating.toFixed(0).padStart(6)} | ${(s.volumeDryingUp ? '是' : '否').padStart(10)} | ${s.latestPrice.toFixed(2).padStart(7)} | ${s.priceChangePct.toFixed(2).padStart(7)} | ${s.distFrom52WeekHigh.toFixed(2).padStart(9)}`
        );
      });
    }

    console.log('\n' + '='.repeat(120));
    console.log(`总计 ${finalStocks.length} 只优质 VCP 股票`);
    console.log('='.repeat(120) + '\n');

  } catch (error: any) {
    logger.error(`Export failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
