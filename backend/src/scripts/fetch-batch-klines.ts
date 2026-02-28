/**
 * 批量获取股票 K线数据
 * 
 * 功能:
 * 1. 从数据库获取股票列表
 * 2. 批量获取日线和周线数据
 * 3. 计算技术指标并保存
 * 
 * 使用:
 * npx ts-node src/scripts/fetch-batch-klines.ts [limit] [offset]
 * 
 * 例子:
 * npx ts-node src/scripts/fetch-batch-klines.ts 100 0    # 获取前100只股票
 * npx ts-node src/scripts/fetch-batch-klines.ts 100 100  # 获取101-200只股票
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TushareService } from '../services/datasource/tushare.service';
import { AkShareService } from '../services/datasource/akshare.service';
import { DataSourceManagerService } from '../services/datasource/datasource-manager.service';
import { TechnicalIndicatorsService, PriceData } from '../services/indicators/technical-indicators.service';
import { PythonBridgeService } from '../services/python-bridge/python-bridge.service';

const prisma = new PrismaClient();

// 从命令行参数获取 limit 和 offset
const limit = parseInt(process.argv[2]) || 50; // 默认50只
const offset = parseInt(process.argv[3]) || 0;  // 默认从0开始

async function processStock(
  stock: any,
  dataSourceManager: DataSourceManagerService,
  indicatorsService: TechnicalIndicatorsService,
  startDateStr: string,
  endDateStr: string,
) {
  console.log(`\n--- Processing ${stock.stockCode} ${stock.stockName} ---`);

  try {
    // ===== 1. 获取和保存日线数据 =====
    console.log(`📈 Fetching daily K-line data...`);
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

    // 保存日线数据
    await prisma.kLineData.deleteMany({
      where: {
        stockCode: stock.stockCode,
        period: 'daily',
      },
    });

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

    // ===== 2. 计算日线技术指标 =====
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

    // 保存日线指标
    await prisma.technicalIndicator.deleteMany({
      where: {
        stockCode: stock.stockCode,
        period: 'daily',
      },
    });

    const indicatorRecords = [];

    // MA
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

    // KDJ
    kdjResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'kdj',
        values: JSON.stringify({ k: item.k, d: item.d, j: item.j }),
      });
    });

    // RSI
    rsiResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'rsi',
        values: JSON.stringify({ rsi: item.rsi }),
      });
    });

    // Volume
    volumeResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'volume',
        values: JSON.stringify({ volume: item.volume, volumeMA: item.volumeMA }),
      });
    });

    // Amount
    amountResults.forEach((item) => {
      indicatorRecords.push({
        stockCode: stock.stockCode,
        date: new Date(item.date),
        period: 'daily' as const,
        indicatorType: 'amount',
        values: JSON.stringify({ amount: item.amount, amountMA: item.amountMA }),
      });
    });

    // 52周标注
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

    // ===== 3. 获取和保存周线数据 =====
    const { data: weeklyData, source: weeklySource } = await dataSourceManager.getWeeklyKLine({
      stockCode: stock.stockCode,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    if (weeklyData.length > 0) {
      await prisma.kLineData.deleteMany({
        where: {
          stockCode: stock.stockCode,
          period: 'weekly',
        },
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

      // 计算周线指标（简化版，只保存必要指标）
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
        where: {
          stockCode: stock.stockCode,
          period: 'weekly',
        },
      });

      const weeklyIndicatorRecords: Array<{
        stockCode: string;
        date: Date;
        period: 'weekly';
        indicatorType: string;
        values: string;
      }> = [];
      weeklyMaResults.forEach((item) => {
        if (item.ma10 || item.ma30 || item.ma40) {
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
        }
      });

      if (weeklyIndicatorRecords.length > 0) {
        await prisma.technicalIndicator.createMany({
          data: weeklyIndicatorRecords,
        });
      }
    }

    console.log(`✅ Successfully processed ${stock.stockCode}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error processing ${stock.stockCode}:`, error instanceof Error ? error.message : error);
    return { success: false, reason: 'error', error };
  }
}

async function main() {
  console.log(`📊 Starting batch K-line data fetch (limit: ${limit}, offset: ${offset})...\n`);

  const configService = new ConfigService();
  const pythonBridge = new PythonBridgeService();
  const tushareService = new TushareService(configService);
  const akshareService = new AkShareService(pythonBridge);
  const dataSourceManager = new DataSourceManagerService(tushareService, akshareService);
  const indicatorsService = new TechnicalIndicatorsService();

  // 获取股票列表
  const stocks = await prisma.stock.findMany({
    skip: offset,
    take: limit,
    orderBy: { stockCode: 'asc' },
  });

  const totalStocks = await prisma.stock.count();

  console.log(`Total stocks in DB: ${totalStocks}`);
  console.log(`Processing: ${offset + 1} to ${Math.min(offset + limit, totalStocks)} (${stocks.length} stocks)\n`);

  if (stocks.length === 0) {
    console.log('⚠️ No stocks to process.');
    return;
  }

  // 数据日期范围 (2年历史数据)
  const endDate = new Date('2024-02-28');
  const startDate = new Date('2022-01-01');
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Date range: ${startDateStr} to ${endDateStr}\n`);

  // 统计
  let successCount = 0;
  let failedCount = 0;
  let noDataCount = 0;

  // 逐个处理股票
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log(`\n[${i + 1}/${stocks.length}] Progress: ${((i / stocks.length) * 100).toFixed(1)}%`);

    const result = await processStock(
      stock,
      dataSourceManager,
      indicatorsService,
      startDateStr,
      endDateStr,
    );

    if (result.success) {
      successCount++;
    } else if (result.reason === 'no_data') {
      noDataCount++;
    } else {
      failedCount++;
    }

    // 避免 API 限流：每处理一只股票后等待
    // Tushare 免费版有每分钟调用次数限制
    if (i < stocks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }
  }

  console.log('\n\n📈 Batch processing completed!');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⚠️  No data: ${noDataCount}`);
  console.log(`  ❌ Failed: ${failedCount}`);
  console.log(`  📊 Total processed: ${stocks.length}`);

  if (offset + limit < totalStocks) {
    console.log(`\n💡 To continue with next batch, run:`);
    console.log(`   npx ts-node src/scripts/fetch-batch-klines.ts ${limit} ${offset + limit}`);
  } else {
    console.log(`\n🎉 All stocks processed!`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
