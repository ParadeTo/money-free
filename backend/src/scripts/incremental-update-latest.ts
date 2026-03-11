/**
 * 真正的增量更新脚本 - 只获取最新数据
 * 
 * 功能:
 * 1. 查询每只股票的最新数据日期
 * 2. 只获取从最新日期到今天的新数据
 * 3. 增量插入新数据（不删除旧数据）
 * 4. 重新计算技术指标（基于完整历史数据）
 * 
 * 使用:
 * npx ts-node src/scripts/incremental-update-latest.ts [limit] [offset]
 * 
 * 例子:
 * npx ts-node src/scripts/incremental-update-latest.ts 100 0   # 更新前100只
 * npx ts-node src/scripts/incremental-update-latest.ts        # 更新所有股票
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
// 支持 --index-only 参数：只更新指数成分股（沪深300+中证500）
const indexOnly = process.argv.includes('--index-only');
const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const limit = parseInt(positionalArgs[0]) || 0; // 0表示全部
const offset = parseInt(positionalArgs[1]) || 0;

async function processStockIncremental(
  stock: any,
  dataSourceManager: DataSourceManagerService,
  indicatorsService: TechnicalIndicatorsService,
) {
  console.log(`\n--- Checking ${stock.stockCode} ${stock.stockName} ---`);

  try {
    // ===== 1. 查询当前最新日期 =====
    const latestRecord = await prisma.kLineData.findFirst({
      where: {
        stockCode: stock.stockCode,
        period: 'daily',
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!latestRecord) {
      console.log('⚠️ No existing data, skipping (use full init script instead)');
      return { success: false, reason: 'no_existing_data' };
    }

    const latestDate = new Date(latestRecord.date);
    const today = new Date();
    
    // 比较日期（忽略时间部分）
    const latestDateStr = latestDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    // 计算需要更新的日期范围
    const nextDay = new Date(latestDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const startDateStr = nextDay.toISOString().split('T')[0];
    const endDateStr = todayStr;

    console.log(`📅 Latest data: ${latestDateStr}`);

    // 如果已经是最新（同一天），跳过
    if (latestDateStr >= todayStr) {
      console.log('✅ Data is already up to date');
      return { success: true, reason: 'already_updated', newRecords: 0 };
    }

    console.log(`📥 Fetching incremental data: ${startDateStr} to ${endDateStr}`);

    // ===== 2. 获取增量日线数据 =====
    const { data: newDailyData, source: dailySource } = await dataSourceManager.getDailyKLine({
      stockCode: stock.stockCode,
      startDate: startDateStr,
      endDate: endDateStr,
    });

    console.log(`✅ Fetched ${newDailyData.length} new daily records from ${dailySource}`);

    if (newDailyData.length === 0) {
      console.log('⚠️ No new data available');
      return { success: true, reason: 'no_new_data', newRecords: 0 };
    }

    // ===== 3. 插入新的K线数据（增量插入）=====
    let insertedCount = 0;
    for (const item of newDailyData) {
      try {
        await prisma.kLineData.upsert({
          where: {
            stockCode_date_period: {
              stockCode: stock.stockCode,
              date: item.date,
              period: 'daily',
            },
          },
          update: {
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            amount: item.amount,
            source: dailySource,
          },
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
        console.error(`Failed to insert record for ${item.date}:`, error);
      }
    }

    console.log(`💾 Inserted ${insertedCount} new records`);

    // ===== 4. 重新计算技术指标（基于完整历史数据）=====
    console.log(`🔢 Recalculating indicators based on full history...`);

    // 获取所有日线数据用于重新计算指标
    const allDailyData = await prisma.kLineData.findMany({
      where: {
        stockCode: stock.stockCode,
        period: 'daily',
      },
      orderBy: { date: 'asc' },
    });

    const priceData: PriceData[] = allDailyData.map((item: typeof allDailyData[number]) => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      amount: item.amount,
    }));

    // 计算所有技术指标
    const maResults = indicatorsService.calculateMA(priceData, { daily: [50, 150, 200] }, 'daily');
    const kdjResults = indicatorsService.calculateKDJ(priceData, 9, 3);
    const rsiResults = indicatorsService.calculateRSI(priceData, 14);
    const volumeResults = indicatorsService.calculateVolume(priceData, 52);
    const amountResults = indicatorsService.calculateAmount(priceData, 52);
    const markers = indicatorsService.calculate52WeekMarkers(priceData);

    // 删除旧指标
    await prisma.technicalIndicator.deleteMany({
      where: {
        stockCode: stock.stockCode,
        period: 'daily',
      },
    });

    // 保存新指标
    const indicatorRecords: any[] = [];

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

    // ===== 5. 处理周线数据（增量）=====
    console.log(`📊 Checking weekly data...`);
    
    const latestWeekly = await prisma.kLineData.findFirst({
      where: {
        stockCode: stock.stockCode,
        period: 'weekly',
      },
      orderBy: { date: 'desc' },
    });

    if (latestWeekly) {
      const weeklyNextDay = new Date(latestWeekly.date);
      weeklyNextDay.setDate(weeklyNextDay.getDate() + 1);
      
      const weeklyStartDateStr = weeklyNextDay.toISOString().split('T')[0];
      
      if (weeklyNextDay < today) {
        const { data: newWeeklyData, source: weeklySource } = await dataSourceManager.getWeeklyKLine({
          stockCode: stock.stockCode,
          startDate: weeklyStartDateStr,
          endDate: endDateStr,
        });

        if (newWeeklyData.length > 0) {
          let weeklyInserted = 0;
          for (const item of newWeeklyData) {
            try {
              await prisma.kLineData.upsert({
                where: {
                  stockCode_date_period: {
                    stockCode: stock.stockCode,
                    date: item.date,
                    period: 'weekly',
                  },
                },
                update: {
                  open: item.open,
                  high: item.high,
                  low: item.low,
                  close: item.close,
                  volume: item.volume,
                  amount: item.amount,
                  source: weeklySource,
                },
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
              // Skip failed records
            }
          }
          console.log(`💾 Inserted ${weeklyInserted} new weekly records`);

          // 重新计算周线指标
          const allWeeklyData = await prisma.kLineData.findMany({
            where: {
              stockCode: stock.stockCode,
              period: 'weekly',
            },
            orderBy: { date: 'asc' },
          });

          const weeklyPriceData: PriceData[] = allWeeklyData.map((item: typeof allWeeklyData[number]) => ({
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
      }
    }

    console.log(`✅ Successfully updated ${stock.stockCode} (+${insertedCount} records)`);
    return { success: true, newRecords: insertedCount };

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, reason: 'error', error: error.message };
  }
}

async function main() {
  const mode = indexOnly ? '指数成分股(沪深300+中证500)' : 'ALL';
  console.log(`📊 Starting incremental update (mode: ${mode}, limit: ${limit || 'ALL'}, offset: ${offset})...\n`);

  const configService = new ConfigService();
  const pythonBridgeService = new PythonBridgeService();
  const tushareService = new TushareService(configService);
  const akshareService = new AkShareService(pythonBridgeService);
  const dataSourceManager = new DataSourceManagerService(tushareService, akshareService);
  const indicatorsService = new TechnicalIndicatorsService();

  // 获取股票列表
  const totalStocks = await prisma.stock.count();
  const where = indexOnly ? { indexCode: { not: null } } : {};
  const stocks = await prisma.stock.findMany({
    where: where as any,
    skip: offset,
    take: limit || undefined,
    orderBy: { stockCode: 'asc' },
  });

  if (indexOnly) {
    console.log(`Total stocks in DB: ${totalStocks}`);
    console.log(`Index members (HS300+ZZ500): ${stocks.length} stocks`);
    console.log(`Processing: ${stocks.length} stocks (index-only mode)\n`);
  } else {
    console.log(`Total stocks in DB: ${totalStocks}`);
    console.log(`Processing: ${offset + 1} to ${offset + stocks.length} (${stocks.length} stocks)\n`);
  }

  // 统计
  let stats = {
    success: 0,
    alreadyUpdated: 0,
    noNewData: 0,
    failed: 0,
    totalNewRecords: 0,
  };

  // 逐个处理股票
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log(`\n[${i + 1}/${stocks.length}] Progress: ${((i / stocks.length) * 100).toFixed(1)}%`);

    const result = await processStockIncremental(stock, dataSourceManager, indicatorsService);

    if (result.success) {
      if (result.reason === 'already_updated') {
        stats.alreadyUpdated++;
      } else if (result.reason === 'no_new_data') {
        stats.noNewData++;
      } else {
        stats.success++;
        stats.totalNewRecords += result.newRecords || 0;
      }
    } else {
      stats.failed++;
    }

    // 避免 API 限流：每处理一只股票后等待
    if (i < stocks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    }
  }

  // 最终统计
  console.log('\n======================================');
  console.log('🎉 增量更新完成！');
  console.log('======================================\n');
  console.log(`处理股票: ${stocks.length} 只`);
  console.log(`成功更新: ${stats.success} 只`);
  console.log(`已是最新: ${stats.alreadyUpdated} 只`);
  console.log(`无新数据: ${stats.noNewData} 只`);
  console.log(`失败: ${stats.failed} 只`);
  console.log(`新增K线: ${stats.totalNewRecords.toLocaleString()} 条\n`);

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
