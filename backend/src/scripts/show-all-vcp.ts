import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { VcpAnalyzerService, KLineBar } from '../services/vcp/vcp-analyzer.service';
import { Logger } from '@nestjs/common';

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
  const logger = new Logger('VCP-All');
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
    logger.log('实时分析所有VCP形态股票，包括收缩中和回调中的...\n');

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
            statusText = `${daysSinceLow}天前回调低点`;
          }
        } else if (daysSinceLow <= 20) {
          // 20天内的回调也标记出来
          status = 'pullback_ended';
          statusText = `${daysSinceLow}天前回调低点`;
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

    // 分类统计
    const inContraction = allVcpStocks.filter(s => s.status === 'contraction');
    const inPullback = allVcpStocks.filter(s => s.status === 'in_pullback');
    const pullbackEnded = allVcpStocks.filter(s => s.status === 'pullback_ended');

    logger.log(`${'='.repeat(180)}`);
    logger.log(`VCP 选股全览（共 ${allVcpStocks.length} 只）`);
    logger.log(`  📊 收缩中: ${inContraction.length} 只 | ⚡ 回调中: ${inPullback.length} 只 | ✅ 回调结束: ${pullbackEnded.length} 只`);
    logger.log(`${'='.repeat(180)}\n`);

    // 输出回调中的股票
    if (inPullback.length > 0) {
      logger.log(`\n⚡ 正在回调中的股票（${inPullback.length} 只）`);
      logger.log(`${'='.repeat(180)}`);
      console.log(
        [
          '代码'.padEnd(10),
          '名称'.padEnd(10),
          '最新价'.padStart(8),
          '涨跌%'.padStart(7),
          'RS'.padStart(5),
          '收缩次数'.padStart(8),
          '收缩%'.padStart(8),
          '回调天数'.padStart(8),
          '回调%'.padStart(8),
          '反弹%'.padStart(8),
          '成交量萎缩'.padStart(10),
          '距52周高%'.padStart(10),
          '距52周低%'.padStart(10),
          '状态'.padEnd(12),
        ].join(' | ')
      );
      console.log('-'.repeat(180));

      for (const stock of inPullback) {
        const pb = stock.pullbackInfo!;
        console.log(
          [
            stock.stockCode.padEnd(10),
            stock.stockName.padEnd(10),
            stock.latestPrice.toFixed(2).padStart(8),
            stock.priceChangePct.toFixed(2).padStart(7),
            stock.rsRating.toFixed(0).padStart(5),
            stock.contractionCount.toString().padStart(8),
            stock.lastContractionPct.toFixed(2).padStart(8),
            pb.durationDays.toString().padStart(8),
            pb.pullbackPct.toFixed(2).padStart(8),
            pb.recoveryPct.toFixed(2).padStart(8),
            (stock.volumeDryingUp ? '是' : '否').padStart(10),
            stock.distFrom52WeekHigh.toFixed(2).padStart(10),
            stock.distFrom52WeekLow.toFixed(2).padStart(10),
            stock.statusText.padEnd(12),
          ].join(' | ')
        );
      }
      console.log('');
    }

    // 输出回调刚结束的股票
    if (pullbackEnded.length > 0) {
      logger.log(`\n✅ 回调刚结束的股票（${pullbackEnded.length} 只）`);
      logger.log(`${'='.repeat(180)}`);
      console.log(
        [
          '代码'.padEnd(10),
          '名称'.padEnd(10),
          '最新价'.padStart(8),
          '涨跌%'.padStart(7),
          'RS'.padStart(5),
          '收缩次数'.padStart(8),
          '收缩%'.padStart(8),
          '回调天数'.padStart(8),
          '回调%'.padStart(8),
          '反弹%'.padStart(8),
          '成交量萎缩'.padStart(10),
          '距52周高%'.padStart(10),
          '距52周低%'.padStart(10),
          '状态'.padEnd(15),
        ].join(' | ')
      );
      console.log('-'.repeat(180));

      for (const stock of pullbackEnded) {
        const pb = stock.pullbackInfo!;
        console.log(
          [
            stock.stockCode.padEnd(10),
            stock.stockName.padEnd(10),
            stock.latestPrice.toFixed(2).padStart(8),
            stock.priceChangePct.toFixed(2).padStart(7),
            stock.rsRating.toFixed(0).padStart(5),
            stock.contractionCount.toString().padStart(8),
            stock.lastContractionPct.toFixed(2).padStart(8),
            pb.durationDays.toString().padStart(8),
            pb.pullbackPct.toFixed(2).padStart(8),
            pb.recoveryPct.toFixed(2).padStart(8),
            (stock.volumeDryingUp ? '是' : '否').padStart(10),
            stock.distFrom52WeekHigh.toFixed(2).padStart(10),
            stock.distFrom52WeekLow.toFixed(2).padStart(10),
            stock.statusText.padEnd(15),
          ].join(' | ')
        );
      }
      console.log('');
    }

    // 输出收缩中的股票（前20只，按RS评分排序）
    if (inContraction.length > 0) {
      const topContraction = inContraction.sort((a, b) => b.rsRating - a.rsRating).slice(0, 20);
      logger.log(`\n📊 收缩中的股票（共${inContraction.length}只，显示前20只，按RS评分排序）`);
      logger.log(`${'='.repeat(160)}`);
      console.log(
        [
          '代码'.padEnd(10),
          '名称'.padEnd(10),
          '最新价'.padStart(8),
          '涨跌%'.padStart(7),
          'RS'.padStart(5),
          '收缩次数'.padStart(8),
          '最后收缩%'.padStart(10),
          '成交量萎缩'.padStart(10),
          '距52周高%'.padStart(10),
          '距52周低%'.padStart(10),
          '状态'.padEnd(10),
        ].join(' | ')
      );
      console.log('-'.repeat(160));

      for (const stock of topContraction) {
        console.log(
          [
            stock.stockCode.padEnd(10),
            stock.stockName.padEnd(10),
            stock.latestPrice.toFixed(2).padStart(8),
            stock.priceChangePct.toFixed(2).padStart(7),
            stock.rsRating.toFixed(0).padStart(5),
            stock.contractionCount.toString().padStart(8),
            stock.lastContractionPct.toFixed(2).padStart(10),
            (stock.volumeDryingUp ? '是' : '否').padStart(10),
            stock.distFrom52WeekHigh.toFixed(2).padStart(10),
            stock.distFrom52WeekLow.toFixed(2).padStart(10),
            stock.statusText.padEnd(10),
          ].join(' | ')
        );
      }
      console.log('');
    }

    logger.log(`\n${'='.repeat(180)}`);
    logger.log('📈 说明:');
    logger.log('  ⚡ 回调中: 当前正在回调过程中（今天是回调低点）');
    logger.log('  ✅ 回调结束: 已经到达回调低点，正在反弹（1-20天内）');
    logger.log('  📊 收缩中: 还未进入回调或上次回调已经很久，当前处于收缩整理中');
    logger.log('  💡 操作建议: 回调中/刚结束的股票更接近买点，收缩中的股票需等待回调');
    logger.log(`${'='.repeat(180)}\n`);

  } catch (error: any) {
    logger.error(`Failed to get VCP results: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
