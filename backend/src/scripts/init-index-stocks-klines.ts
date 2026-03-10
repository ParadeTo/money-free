/**
 * 初始化指数成分股的K线数据（沪深300+中证1000）
 * 
 * 功能：只初始化标记为指数成分股的股票（约1037只），大幅减少初始化时间
 * 
 * 使用:
 * npx ts-node src/scripts/init-index-stocks-klines.ts [limit] [offset]
 * 
 * 例子:
 * npx ts-node src/scripts/init-index-stocks-klines.ts 100 0    # 初始化前100只指数成分股
 * npx ts-node src/scripts/init-index-stocks-klines.ts         # 初始化所有指数成分股
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TushareService } from '../services/datasource/tushare.service';
import { AkShareService } from '../services/datasource/akshare.service';
import { DataSourceManagerService } from '../services/datasource/datasource-manager.service';
import { TechnicalIndicatorsService, PriceData } from '../services/indicators/technical-indicators.service';
import { PythonBridgeService } from '../services/python-bridge/python-bridge.service';

const prisma = new PrismaClient();

const limit = parseInt(process.argv[2]) || 0;
const offset = parseInt(process.argv[3]) || 0;

async function processStock(
  stock: any,
  dataSourceManager: DataSourceManagerService,
  indicatorsService: TechnicalIndicatorsService,
  startDateStr: string,
  endDateStr: string,
) {
  console.log(`\n--- Processing ${stock.stockCode} ${stock.stockName} [${stock.indexCode}] ---`);

  try {
    // 获取日线数据
    console.log(`📈 Fetching daily K-line data (20 years)...`);
    const { data: dailyData, source: dailySource } = await dataSourceManager.getDailyKLine({
      stockCode: stock.stockCode,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    console.log(`✅ Fetched ${dailyData.length} daily records from ${dailySource}`);

    if (dailyData.length === 0) {
      console.log('⚠️ No data available, skipping...');
      return { success: false, reason: 'no_data' };
    }

    // 删除旧数据
    await prisma.kLineData.deleteMany({
      where: { stockCode: stock.stockCode, period: 'daily' },
    });

    // 插入日线数据
    await prisma.kLineData.createMany({
      data: dailyData.map((item) => ({
        stockCode: stock.stockCode,
        date: item.date,
        period: 'daily',
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        amount: item.amount,
        source: dailySource,
      })),
    });

    // 计算技术指标
    const sortedDailyData = [...dailyData].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const priceData: PriceData[] = sortedDailyData.map((item) => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      amount: item.amount,
    }));

    const maResults = indicatorsService.calculateMA(priceData, { daily: [50, 150, 200] }, 'daily');
    const kdjResults = indicatorsService.calculateKDJ(priceData, 9, 3);
    const rsiResults = indicatorsService.calculateRSI(priceData, 14);
    const volumeResults = indicatorsService.calculateVolume(priceData, 52);
    const amountResults = indicatorsService.calculateAmount(priceData, 52);
    const markers = indicatorsService.calculate52WeekMarkers(priceData);

    await prisma.technicalIndicator.deleteMany({
      where: { stockCode: stock.stockCode, period: 'daily' },
    });

    const indicatorRecords: any[] = [];

    maResults.forEach((item) => {
      if (item.ma50 || item.ma150 || item.ma200) {
        indicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily' as const,
          indicatorType: 'ma',
          values: JSON.stringify({
            ma50: item.ma50 || null,
            ma150: item.ma150 || null,
            ma200: item.ma200 || null,
          }),
        });
      }
    });

    kdjResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'kdj',
        values: JSON.stringify({ k: item.k, d: item.d, j: item.j }),
      });
    });

    rsiResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'rsi',
        values: JSON.stringify({ rsi: item.rsi }),
      });
    });

    volumeResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'volume',
        values: JSON.stringify({ volume: item.volume, volumeMA: item.volumeMA }),
      });
    });

    amountResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'amount',
        values: JSON.stringify({ amount: item.amount, amountMA: item.amountMA }),
      });
    });

    if (markers) {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(),
        period: 'daily' as const,
        indicatorType: 'week52_marker',
        values: JSON.stringify(markers),
      });
    }

    if (indicatorRecords.length > 0) {
      await prisma.technicalIndicator.createMany({
        data: indicatorRecords,
      });
    }

    // 获取周线数据
    console.log(`📊 Fetching weekly K-line data...`);
    const { data: weeklyData, source: weeklySource } = await dataSourceManager.getWeeklyKLine({
      stockCode: stock.stockCode,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    console.log(`✅ Fetched ${weeklyData.length} weekly records from ${weeklySource}`);

    if (weeklyData.length > 0) {
      await prisma.kLineData.deleteMany({
        where: { stockCode: stock.stockCode, period: 'weekly' },
      });

      await prisma.kLineData.createMany({
        data: weeklyData.map((item) => ({
          stockCode: stock.stockCode,
          date: item.date,
          period: 'weekly',
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          amount: item.amount,
          source: weeklySource,
        })),
      });

      const sortedWeeklyData = [...weeklyData].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const weeklyPriceData: PriceData[] = sortedWeeklyData.map((item) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        amount: item.amount,
      }));

      const weeklyMaResults = indicatorsService.calculateMA(weeklyPriceData, { weekly: [10, 30, 40] }, 'weekly');

      await prisma.technicalIndicator.deleteMany({
        where: { stockCode: stock.stockCode, period: 'weekly' },
      });

      const weeklyIndicatorRecords: any[] = [];
      weeklyMaResults.forEach((item) => {
        weeklyIndicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'weekly' as const,
          indicatorType: 'ma',
          values: JSON.stringify({
            ma10: item.ma10 || null,
            ma30: item.ma30 || null,
            ma40: item.ma40 || null,
          }),
        });
      });

      if (weeklyIndicatorRecords.length > 0) {
        await prisma.technicalIndicator.createMany({
          data: weeklyIndicatorRecords,
        });
      }
    }

    console.log(`✅ Successfully processed ${stock.stockCode}`);
    return { success: true };

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, reason: 'error', error: error.message };
  }
}

async function main() {
  console.log(`📊 初始化指数成分股K线数据 (沪深300+中证1000)...\n`);

  const configService = new ConfigService();
  const pythonBridgeService = new PythonBridgeService();
  const tushareService = new TushareService(configService);
  const akshareService = new AkShareService(pythonBridgeService);
  const dataSourceManager = new DataSourceManagerService(tushareService, akshareService);
  const indicatorsService = new TechnicalIndicatorsService();

  // 只获取指数成分股
  const totalIndexStocks = await prisma.stock.count({
    where: { indexCode: { not: null } },
  });

  const stocks = await prisma.stock.findMany({
    where: { indexCode: { not: null } },
    skip: offset,
    take: limit || undefined,
    orderBy: { stockCode: 'asc' },
  });

  if (stocks.length === 0) {
    console.log('⚠️ 没有找到指数成分股！请先运行: npx ts-node src/scripts/sync-index-members.ts');
    return;
  }

  console.log(`总指数成分股: ${totalIndexStocks}`);
  console.log(`本次处理: ${offset + 1} 到 ${offset + stocks.length} (${stocks.length} 只)\n`);
  console.log(`预计耗时: ~${((stocks.length * 6.5) / 60).toFixed(1)} 分钟\n`);

  // 20年历史数据
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 20);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = new Date().toISOString().split('T')[0];

  console.log(`日期范围: ${startDateStr} 到 ${endDateStr}\n`);

  let stats = { success: 0, failed: 0 };

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log(`\n[${i + 1}/${stocks.length}] Progress: ${((i / stocks.length) * 100).toFixed(1)}%`);

    const result = await processStock(stock, dataSourceManager, indicatorsService, startDateStr, endDateStr);

    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    // API 限流
    if (i < stocks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n======================================');
  console.log('🎉 初始化完成！');
  console.log('======================================\n');
  console.log(`处理股票: ${stocks.length} 只`);
  console.log(`成功: ${stats.success} 只`);
  console.log(`失败: ${stats.failed} 只\n`);

  const klineCount = await prisma.kLineData.count();
  const indicatorCount = await prisma.technicalIndicator.count();

  console.log(`K线数据: ${klineCount.toLocaleString()} 条`);
  console.log(`技术指标: ${indicatorCount.toLocaleString()} 条\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
