import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import { VcpAnalyzerService, KLineBar } from '../services/vcp/vcp-analyzer.service';
import { Logger } from '@nestjs/common';

async function main() {
  const logger = new Logger('VCP-Analysis');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const prisma = app.get(PrismaService);
    const vcpAnalyzer = app.get(VcpAnalyzerService);

    // 从命令行参数获取股票代码或名称，默认为德业股份
    const input = process.argv[2] || '605117';

    // 尝试查找股票（支持代码或名称）
    let stock = await prisma.stock.findUnique({
      where: { stockCode: input },
      select: {
        stockCode: true,
        stockName: true,
        market: true,
        currency: true,
      },
    });

    // 如果通过代码找不到，尝试通过名称查找
    if (!stock) {
      stock = await prisma.stock.findFirst({
        where: { 
          stockName: { contains: input }
        },
        select: {
          stockCode: true,
          stockName: true,
          market: true,
          currency: true,
        },
      });
    }

    if (!stock) {
      logger.error(`Stock "${input}" not found (searched by code and name)`);
      process.exit(1);
    }

    // 货币符号映射
    const currencySymbol = {
      CNY: '¥',
      HKD: 'HK$',
      USD: '$',
    }[stock.currency] || '';

    const marketName = {
      SH: 'A股(沪)',
      SZ: 'A股(深)',
      HK: '港股',
      US: '美股',
    }[stock.market] || stock.market;

    logger.log(`\n${'='.repeat(100)}`);
    logger.log(`📈 VCP 形态分析 - ${stock.stockName} (${stock.stockCode}) [${marketName}]`);
    logger.log(`${'='.repeat(100)}\n`);

    // 获取最新的VCP扫描结果
    const vcpResult = await prisma.vcpScanResult.findFirst({
      where: { stockCode: stock.stockCode },
      orderBy: { scanDate: 'desc' },
    });

    if (vcpResult) {
      logger.log(`📊 最新扫描结果 (${vcpResult.scanDate.toISOString().split('T')[0]}):`);
      logger.log(`  ✓ 趋势模板: ${vcpResult.trendTemplatePass ? '✅ 通过' : '❌ 未通过'}`);
      logger.log(`  ✓ 收缩次数: ${vcpResult.contractionCount}`);
      logger.log(`  ✓ 最后收缩幅度: ${vcpResult.lastContractionPct.toFixed(2)}%`);
      logger.log(`  ✓ 成交量萎缩: ${vcpResult.volumeDryingUp ? '是' : '否'}`);
      logger.log(`  ✓ RS评分: ${vcpResult.rsRating}`);
      logger.log(`  ✓ 处于回调: ${vcpResult.inPullback ? '是' : '否'}`);
      logger.log(`  ✓ 回调次数: ${vcpResult.pullbackCount}`);
      logger.log(`  ✓ 最新价: ${currencySymbol}${vcpResult.latestPrice.toFixed(2)}`);
      logger.log(`  ✓ 涨跌幅: ${vcpResult.priceChangePct.toFixed(2)}%`);
      logger.log(`  ✓ 距52周高: ${vcpResult.distFrom52WeekHigh.toFixed(2)}%`);
      logger.log(`  ✓ 距52周低: ${vcpResult.distFrom52WeekLow.toFixed(2)}%\n`);
    }

    // 获取K线数据
    const klines = await prisma.kLineData.findMany({
      where: { stockCode: stock.stockCode, period: 'daily' },
      orderBy: { date: 'desc' },
      take: 300,
      select: { date: true, open: true, high: true, low: true, close: true, volume: true },
    });

    if (klines.length === 0) {
      logger.warn('No K-line data found');
      return;
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

    // 实时分析
    logger.log(`📊 实时VCP分析 (基于最近 ${bars.length} 天K线):\n`);
    const analysis = vcpAnalyzer.analyze(bars);

    logger.log(`  VCP形态: ${analysis.hasVcp ? '✅ 有效' : '❌ 无效'}`);
    logger.log(`  收缩次数: ${analysis.contractionCount}`);
    logger.log(`  最后收缩幅度: ${analysis.lastContractionPct.toFixed(2)}%`);
    logger.log(`  成交量萎缩: ${analysis.volumeDryingUp ? '是' : '否'}\n`);

    // 输出收缩详情
    if (analysis.contractions.length > 0) {
      logger.log(`${'─'.repeat(100)}`);
      logger.log(`📉 收缩阶段详情 (${analysis.contractions.length} 个):\n`);
      
      analysis.contractions.forEach((contraction, i) => {
        logger.log(`  [收缩 ${i + 1}]`);
        logger.log(`    期间: ${contraction.swingHighDate} → ${contraction.swingLowDate}`);
        logger.log(`    高点: ${currencySymbol}${contraction.swingHighPrice.toFixed(2)}`);
        logger.log(`    低点: ${currencySymbol}${contraction.swingLowPrice.toFixed(2)}`);
        logger.log(`    幅度: ${contraction.depthPct.toFixed(2)}%`);
        logger.log(`    持续: ${contraction.durationDays} 天`);
        logger.log(`    平均成交量: ${(contraction.avgVolume / 100).toFixed(0)} 手\n`);
      });
    }

    // 输出回调详情
    const pullbacks = analysis.pullbacks || [];
    if (pullbacks.length > 0) {
      logger.log(`${'─'.repeat(100)}`);
      logger.log(`📈 回调阶段详情 (${pullbacks.length} 个):\n`);
      
      pullbacks.forEach((pullback, i) => {
        const lastBar = bars[bars.length - 1];
        const pullbackLowDate = new Date(pullback.lowDate);
        const lastBarDate = new Date(lastBar.date);
        const daysSinceLow = Math.floor((lastBarDate.getTime() - pullbackLowDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const isActive = daysSinceLow <= 5;
        const status = daysSinceLow === 0 ? '⚡ 回调中' : `${daysSinceLow}天前到达最低点`;
        
        logger.log(`  [回调 ${i + 1}] ${isActive ? '🔴 ' + status : status}`);
        logger.log(`    期间: ${pullback.highDate} → ${pullback.lowDate}`);
        logger.log(`    高点: ${currencySymbol}${pullback.highPrice.toFixed(2)}`);
        logger.log(`    低点: ${currencySymbol}${pullback.lowPrice.toFixed(2)}`);
        logger.log(`    幅度: ${pullback.pullbackPct.toFixed(2)}%`);
        logger.log(`    持续: ${pullback.durationDays} 天`);
        logger.log(`    上升趋势中: ${pullback.isInUptrend ? '是' : '否'}`);
        logger.log(`    平均成交量: ${(pullback.avgVolume / 100).toFixed(0)} 手\n`);
      });

      // 最后一个回调的详细信息
      const lastPullback = pullbacks[pullbacks.length - 1];
      const lastBar = bars[bars.length - 1];
      const pullbackLowDate = new Date(lastPullback.lowDate);
      const lastBarDate = new Date(lastBar.date);
      const daysSinceLow = Math.floor((lastBarDate.getTime() - pullbackLowDate.getTime()) / (1000 * 60 * 60 * 24));

      logger.log(`${'─'.repeat(100)}`);
      logger.log(`🎯 最新回调分析:\n`);
      logger.log(`  回调开始: ${lastPullback.highDate} @ ${currencySymbol}${lastPullback.highPrice.toFixed(2)}`);
      logger.log(`  回调最低: ${lastPullback.lowDate} @ ${currencySymbol}${lastPullback.lowPrice.toFixed(2)}`);
      logger.log(`  回调幅度: ${lastPullback.pullbackPct.toFixed(2)}%`);
      logger.log(`  回调天数: ${lastPullback.durationDays} 天`);
      logger.log(`  距最低点: ${daysSinceLow} 天`);
      logger.log(`  当前价格: ${currencySymbol}${lastBar.close.toFixed(2)}`);
      
      const recoveryPct = ((lastBar.close - lastPullback.lowPrice) / lastPullback.lowPrice * 100);
      logger.log(`  从最低点反弹: ${recoveryPct.toFixed(2)}%`);
      
      const distFromHigh = ((lastBar.close - lastPullback.highPrice) / lastPullback.highPrice * 100);
      logger.log(`  距回调高点: ${distFromHigh.toFixed(2)}%`);
      
      if (daysSinceLow === 0) {
        logger.log(`  📍 状态: 🔴 正在回调中`);
      } else if (daysSinceLow <= 3) {
        logger.log(`  📍 状态: 🟡 刚结束回调，可能开始反弹`);
      } else {
        logger.log(`  📍 状态: 🟢 回调结束 ${daysSinceLow} 天`);
      }
    }

    // 显示最近10天的K线数据
    logger.log(`\n${'─'.repeat(100)}`);
    logger.log(`📅 最近 10 天K线数据:\n`);
    
    const recentBars = bars.slice(-10);
    console.log(
      [
        '日期'.padEnd(12),
        '开盘'.padStart(10),
        '最高'.padStart(10),
        '最低'.padStart(10),
        '收盘'.padStart(10),
        '涨跌幅%'.padStart(10),
        '成交量(手)'.padStart(12),
      ].join(' | ')
    );
    console.log('-'.repeat(100));

    recentBars.forEach((bar, i) => {
      const prevClose = i > 0 ? recentBars[i - 1].close : bar.open;
      const changePct = ((bar.close - prevClose) / prevClose * 100);
      
      console.log(
        [
          bar.date.padEnd(12),
          bar.open.toFixed(2).padStart(10),
          bar.high.toFixed(2).padStart(10),
          bar.low.toFixed(2).padStart(10),
          bar.close.toFixed(2).padStart(10),
          changePct.toFixed(2).padStart(10),
          (bar.volume / 100).toFixed(0).padStart(12),
        ].join(' | ')
      );
    });

    logger.log(`\n${'='.repeat(100)}\n`);

  } catch (error: any) {
    logger.error(`Analysis failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
