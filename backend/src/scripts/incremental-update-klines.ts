/**
 * 智能增量更新K线数据（20年历史）
 * 
 * 功能:
 * 1. 检测每只股票现有数据的日期范围
 * 2. 只补充缺失的时间段（2006-2026）
 * 3. 保留已有数据，使用 upsert 避免重复
 * 4. 重新计算技术指标确保准确性
 * 
 * 使用:
 * npx ts-node src/scripts/incremental-update-klines.ts [limit] [offset]
 * 
 * 例子:
 * npx ts-node src/scripts/incremental-update-klines.ts 10 0    # 测试前10只
 * npx ts-node src/scripts/incremental-update-klines.ts 100 0   # 更新前100只
 * npx ts-node src/scripts/incremental-update-klines.ts         # 更新所有股票
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
const limit = parseInt(process.argv[2]) || 0; // 0表示全部
const offset = parseInt(process.argv[3]) || 0;

// 目标日期范围：20年历史数据
const TARGET_START = new Date('2006-03-01');
const TARGET_END = new Date('2026-03-01');

async function processStock(
  stock: any,
  dataSourceManager: DataSourceManagerService,
  indicatorsService: TechnicalIndicatorsService,
) {
  console.log(`\n--- Checking ${stock.stockCode} ${stock.stockName} ---`);

  // 检测数据缺口
  const existing = await prisma.kLineData.findMany({
    where: { stockCode: stock.stockCode, period: 'daily' },
    orderBy: { date: 'asc' },
    select: { date: true },
  });

  let startDateStr: string;
  let endDateStr: string;
  let updateType: string;

  if (existing.length === 0) {
    // 无数据，全量获取
    startDateStr = TARGET_START.toISOString().split('T')[0];
    endDateStr = TARGET_END.toISOString().split('T')[0];
    updateType = 'FULL';
    console.log(`📊 No existing data, fetching full 20 years`);
  } else {
    const currentStart = existing[0].date;
    const currentEnd = existing[existing.length - 1].date;

    console.log(`📊 Existing data: ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}`);

    // 优先补充早期数据
    if (currentStart > TARGET_START) {
      const gapEnd = new Date(currentStart);
      gapEnd.setDate(gapEnd.getDate() - 1);
      startDateStr = TARGET_START.toISOString().split('T')[0];
      endDateStr = gapEnd.toISOString().split('T')[0];
      updateType = 'BEFORE';
      console.log(`📊 Gap detected BEFORE: need ${startDateStr} to ${endDateStr}`);
    } else if (currentEnd < TARGET_END) {
      const gapStart = new Date(currentEnd);
      gapStart.setDate(gapStart.getDate() + 1);
      startDateStr = gapStart.toISOString().split('T')[0];
      endDateStr = TARGET_END.toISOString().split('T')[0];
      updateType = 'AFTER';
      console.log(`📊 Gap detected AFTER: need ${startDateStr} to ${endDateStr}`);
    } else {
      console.log('✅ Data is complete, skipping...');
      return { success: true, action: 'skipped' };
    }
  }

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
      console.log('⚠️ No new data available, skipping...');
      return { success: true, action: 'no_data' };
    }

    // 保存日线数据（增量模式：upsert逐条插入，避免重复）
    console.log(`💾 Saving ${dailyData.length} daily records (incremental)...`);
    let insertedCount = 0;
    for (const item of dailyData) {
      try {
        await prisma.kLineData.upsert({
          where: {
            stockCode_date_period: {
              stockCode: stock.stockCode,
              date: item.date,
              period: 'daily',
            },
          },
          update: {},
          create: {
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
          },
        });
        insertedCount++;
      } catch (error) {
        // 跳过插入失败的记录
      }
    }
    console.log(`✅ Inserted ${insertedCount} new daily records`);

    // ===== 2. 重新计算日线技术指标（基于完整数据）=====
    console.log(`🔢 Recalculating daily indicators based on full dataset...`);
    
    // 获取该股票的所有日线数据用于计算
    const allDailyRecords = await prisma.kLineData.findMany({
      where: {
        stockCode: stock.stockCode,
        period: 'daily',
      },
      orderBy: { date: 'asc' },
    });

    const priceData: PriceData[] = allDailyRecords.map((item: typeof allDailyRecords[number]) => ({
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

    // 删除旧指标（因为新数据会影响MA等计算）
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
      // 保存周线数据（增量模式）
      console.log(`💾 Saving ${weeklyData.length} weekly records (incremental)...`);
      let weeklyInserted = 0;
      for (const item of weeklyData) {
        try {
          await prisma.kLineData.upsert({
            where: {
              stockCode_date_period: {
                stockCode: stock.stockCode,
                date: item.date,
                period: 'weekly',
              },
            },
            update: {},
            create: {
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
            },
          });
          weeklyInserted++;
        } catch (error) {
          // 跳过失败的记录
        }
      }
      console.log(`✅ Inserted ${weeklyInserted} new weekly records`);

      // 重新计算周线指标（基于完整数据）
      console.log(`🔢 Recalculating weekly indicators...`);
      
      const allWeeklyRecords = await prisma.kLineData.findMany({
        where: {
          stockCode: stock.stockCode,
          period: 'weekly',
        },
        orderBy: { date: 'asc' },
      });

      const weeklyPriceData: PriceData[] = allWeeklyRecords.map((item: typeof allWeeklyRecords[number]) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        amount: item.amount,
      }));

      const weeklyMaResults = indicatorsService.calculateMA(weeklyPriceData, { weekly: [10, 30, 40] }, 'weekly');

      // 删除旧周线指标
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

  // 检测数据缺口并确定需要获取的日期范围
  console.log(`Target range: 2006-03-01 to 2026-03-01 (20 years)\n`);
  
  let totalGaps = { before: 0, after: 0, complete: 0, full: 0 };
  
  // 先扫描所有股票，统计缺口类型
  console.log('Scanning data gaps...\n');
  for (const stock of stocks) {
    const existing = await prisma.kLineData.findMany({
      where: { stockCode: stock.stockCode, period: 'daily' },
      orderBy: { date: 'asc' },
      select: { date: true },
      take: 2,
    });
    
    if (existing.length === 0) {
      totalGaps.full++;
    } else {
      const currentStart = existing[0].date;
      const currentEnd = existing[existing.length - 1]?.date || currentStart;
      
      if (currentStart > TARGET_START) totalGaps.before++;
      if (currentEnd < TARGET_END) totalGaps.after++;
      if (currentStart <= TARGET_START && currentEnd >= TARGET_END) totalGaps.complete++;
    }
  }
  
  console.log(`Gap analysis:`);
  console.log(`  Need full data: ${totalGaps.full} stocks`);
  console.log(`  Need earlier data: ${totalGaps.before} stocks`);
  console.log(`  Need latest data: ${totalGaps.after} stocks`);
  console.log(`  Already complete: ${totalGaps.complete} stocks\n`);

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
