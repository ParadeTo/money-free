import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { VcpAnalyzerService, KLineBar } from '../services/vcp/vcp-analyzer.service';
import { Logger } from '@nestjs/common';

async function main() {
  const logger = new Logger('VCP-Pullback');
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
    logger.log(`Latest scan date: ${scanDate.toISOString().split('T')[0]}`);
    logger.log('实时分析最新K线数据，寻找处于回调中的股票...\n');

    // 查询符合 VCP 基础条件的股票
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

    const stocksInPullback = [];

    // 实时分析每只股票的最新K线，判断是否处于回调中
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

      // 判断最后一个回调是否仍在进行中
      if (pullbacks.length > 0) {
        const lastPullback = pullbacks[pullbacks.length - 1];
        const lastBar = bars[bars.length - 1];
        
        // 如果回调的最低点日期是最近几天（意味着回调可能还在进行中）
        const lastPullbackLowDate = new Date(lastPullback.lowDate);
        const lastBarDate = new Date(lastBar.date);
        const daysDiff = Math.floor((lastBarDate.getTime() - lastPullbackLowDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 如果回调最低点在最近5天内，认为可能还在回调中
        if (daysDiff <= 5) {
          stocksInPullback.push({
            ...r,
            lastPullback,
            latestBar: lastBar,
            daysSinceEnd: daysDiff,
          });
        }
      }
    }

    if (stocksInPullback.length === 0) {
      logger.warn('No stocks currently in pullback');
      return;
    }

    logger.log(`${'='.repeat(160)}`);
    logger.log(`VCP 选股 - 当前处于回调中的股票（共 ${stocksInPullback.length} 只）`);
    logger.log(`${'='.repeat(160)}\n`);

    // 表头
    console.log(
      [
        '股票代码'.padEnd(10),
        '股票名称'.padEnd(10),
        '最新价'.padStart(8),
        '涨跌幅%'.padStart(8),
        '收缩次数'.padStart(8),
        '最后收缩%'.padStart(10),
        '成交量萎缩'.padStart(10),
        'RS评分'.padStart(8),
        '回调天数'.padStart(8),
        '回调幅度%'.padStart(10),
        '回调起始价'.padStart(10),
        '当前状态'.padEnd(10),
        '距52周高%'.padStart(11),
      ].join(' | ')
    );
    console.log('-'.repeat(160));

    // 输出每只股票
    for (const stock of stocksInPullback) {
      const r = stock;
      const lastPullback = stock.lastPullback;
      
      const pullbackDays = lastPullback.durationDays;
      const pullbackDepth = lastPullback.pullbackPct.toFixed(2);
      const pullbackStartPrice = lastPullback.highPrice.toFixed(2);
      const status = stock.daysSinceEnd === 0 ? '回调中' : `${stock.daysSinceEnd}天前`;

      console.log(
        [
          r.stockCode.padEnd(10),
          r.stock.stockName.padEnd(10),
          (r.latestPrice ?? 0).toFixed(2).padStart(8),
          (r.priceChangePct ?? 0).toFixed(2).padStart(8),
          (r.contractionCount ?? 0).toString().padStart(8),
          (r.lastContractionPct ?? 0).toFixed(2).padStart(10),
          (r.volumeDryingUp ? '是' : '否').padStart(10),
          (r.rsRating ?? 0).toFixed(0).padStart(8),
          pullbackDays.toString().padStart(8),
          pullbackDepth.padStart(10),
          pullbackStartPrice.padStart(10),
          status.padEnd(10),
          (r.distFrom52WeekHigh ?? 0).toFixed(2).padStart(11),
        ].join(' | ')
      );
    }

    logger.log(`\n${'='.repeat(160)}`);
    logger.log(`总计: ${stocksInPullback.length} 只股票当前处于回调过程中`);
    logger.log(`${'='.repeat(160)}\n`);

    // 输出详细回调信息
    logger.log('\n📊 回调详情 (前10只):\n');
    for (const stock of stocksInPullback.slice(0, 10)) {
      const pb = stock.lastPullback;
      logger.log(`${stock.stockCode} ${stock.stock.stockName}:`);
      logger.log(`  回调期间: ${pb.highDate} → ${pb.lowDate} (${pb.durationDays}天)`);
      logger.log(`  回调幅度: ${pb.pullbackPct.toFixed(2)}% (从 ${pb.highPrice.toFixed(2)} → ${pb.lowPrice.toFixed(2)})`);
      logger.log(`  当前价格: ${stock.latestPrice.toFixed(2)} (${stock.daysSinceEnd === 0 ? '回调中' : `${stock.daysSinceEnd}天前最低点`})`);
      logger.log('');
    }

  } catch (error: any) {
    logger.error(`Failed to get VCP pullback results: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
