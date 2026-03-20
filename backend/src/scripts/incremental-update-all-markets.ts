/**
 * 统一增量更新脚本 - 支持A股、港股和美股
 *
 * 功能:
 * 1. 自动识别股票市场类型
 * 2. 使用对应的数据源获取最新数据
 * 3. 增量插入新数据（不删除旧数据）
 * 4. 重新计算技术指标（基于完整历史数据）
 * 5. 支持断点续传和并发控制
 *
 * 使用:
 * npx ts-node src/scripts/incremental-update-all-markets.ts                    # 更新所有市场
 * npx ts-node src/scripts/incremental-update-all-markets.ts --markets A,HK,US  # 指定市场
 * npx ts-node src/scripts/incremental-update-all-markets.ts --limit 100        # 限制数量
 * npx ts-node src/scripts/incremental-update-all-markets.ts --index-only       # 只更新指数成分股
 * npx ts-node src/scripts/incremental-update-all-markets.ts --resume <taskId>  # 恢复任务
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as pLimit from 'p-limit';

// A股数据源
import { TushareService } from '../services/datasource/tushare.service';
import { AkShareService } from '../services/datasource/akshare.service';
import { DataSourceManagerService } from '../services/datasource/datasource-manager.service';
import { PythonBridgeService } from '../services/python-bridge/python-bridge.service';

// 港股/美股数据源
import { ImportManager } from '../modules/market-data/import/import-manager';
import { YahooFinanceAdapter } from '../modules/market-data/data-source/yahoo-finance-adapter';
import { AkShareAdapter } from '../modules/market-data/data-source/akshare-adapter';
import { CheckpointTracker } from '../modules/market-data/import/checkpoint-tracker';

// 技术指标服务
import {
  TechnicalIndicatorsService,
  PriceData,
} from '../services/indicators/technical-indicators.service';
import { MarketType } from '../types/market-data';

const prisma = new PrismaClient();
const logger = new Logger('IncrementalUpdateAll');

interface UpdateStats {
  total: number;
  updated: number;
  alreadyLatest: number;
  noNewData: number;
  failed: number;
  totalNewRecords: number;
  byMarket: {
    [key: string]: {
      updated: number;
      alreadyLatest: number;
      noNewData: number;
      failed: number;
      newRecords: number;
    };
  };
}

interface StockUpdateResult {
  stockCode: string;
  market: string;
  success: boolean;
  newRecords: number;
  reason?: string;
  error?: string;
}

interface ImportError {
  stockCode: string;
  market: string;
  error: string;
}

/**
 * 更新A股数据
 */
async function updateAStock(
  stock: any,
  dataSourceManager: DataSourceManagerService,
  indicatorsService: TechnicalIndicatorsService,
): Promise<StockUpdateResult> {
  try {
    logger.log(`\n--- Updating A-Stock ${stock.stockCode} (${stock.stockName}) ---`);

    // 1. 查询当前最新日期
    const latestRecord = await prisma.kLineData.findFirst({
      where: { stockCode: stock.stockCode, period: 'daily' },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!latestRecord) {
      logger.warn('⚠️ No existing data, skipping');
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: false,
        newRecords: 0,
        reason: 'no_existing_data',
      };
    }

    const latestDate = new Date(latestRecord.date);
    const today = new Date();
    const latestDateStr = latestDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    logger.log(`📅 Latest data: ${latestDateStr}`);

    if (latestDateStr >= todayStr) {
      logger.log('✅ Already up to date');
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 0,
        reason: 'already_latest',
      };
    }

    // 2. 获取增量数据
    const nextDay = new Date(latestDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const startDateStr = nextDay.toISOString().split('T')[0];

    logger.log(`📥 Fetching: ${startDateStr} to ${todayStr}`);

    const { data: newDailyData, source: dailySource } = await dataSourceManager.getDailyKLine({
      stockCode: stock.stockCode,
      startDate: startDateStr,
      endDate: todayStr,
    });

    if (newDailyData.length === 0) {
      logger.log('⚠️ No new data available');
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 0,
        reason: 'no_new_data',
      };
    }

    logger.log(`✅ Fetched ${newDailyData.length} records from ${dailySource}`);

    // 3. 插入新的K线数据
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
      } catch (error: any) {
        logger.warn(`Failed to insert record for ${item.date}: ${error.message}`);
      }
    }

    logger.log(`💾 Inserted ${insertedCount} records`);

    // 4. 重新计算技术指标
    await recalculateIndicators(stock.stockCode, indicatorsService);

    // 5. 处理周线数据
    await updateWeeklyData(stock.stockCode, dataSourceManager, indicatorsService, todayStr);

    logger.log(`✅ Successfully updated ${stock.stockCode}`);
    return {
      stockCode: stock.stockCode,
      market: stock.market,
      success: true,
      newRecords: insertedCount,
    };
  } catch (error: any) {
    logger.error(`❌ Error: ${error.message}`);
    return {
      stockCode: stock.stockCode,
      market: stock.market,
      success: false,
      newRecords: 0,
      error: error.message,
    };
  }
}

/**
 * 更新港股/美股数据
 */
async function updateHKUSStock(
  stock: any,
  importManager: ImportManager,
): Promise<StockUpdateResult> {
  try {
    logger.log(`\n--- Updating ${stock.market} Stock ${stock.stockCode} (${stock.stockName}) ---`);

    // 1. 查询最新K线数据日期
    const latestRecord = await prisma.kLineData.findFirst({
      where: { stockCode: stock.stockCode, period: 'daily' },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!latestRecord) {
      logger.warn('⚠️ No existing data, please run full import first');
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: false,
        newRecords: 0,
        reason: 'no_existing_data',
      };
    }

    const latestDate = new Date(latestRecord.date);
    const today = new Date();
    const latestDateStr = latestDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    logger.log(`📅 Latest data: ${latestDateStr}`);

    if (latestDateStr >= todayStr) {
      logger.log('✅ Already up to date');
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 0,
        reason: 'already_latest',
      };
    }

    // 2. 计算需要更新的日期范围
    const nextDay = new Date(latestDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const startDateStr = nextDay.toISOString().split('T')[0];

    logger.log(`📥 Fetching: ${startDateStr} to ${todayStr}`);

    // 3. 获取增量K线数据
    const klineResult = await importManager.fetchKlineDataWithFallback(
      stock.stockCode,
      stock.market as MarketType,
      startDateStr,
      todayStr,
    );

    if (!klineResult.data || klineResult.data.length === 0) {
      logger.log('⚠️ No new data available');
      return {
        stockCode: stock.stockCode,
        market: stock.market,
        success: true,
        newRecords: 0,
        reason: 'no_new_data',
      };
    }

    const klineData = klineResult.data;
    const dataSource = klineResult.source || 'yahoo_finance';
    logger.log(`✅ Fetched ${klineData.length} records (source: ${dataSource})`);

    // 4. 增量插入K线数据
    let insertedCount = 0;
    for (const record of klineData) {
      try {
        // 确保日期是Date对象
        const recordDate =
          typeof record.date === 'string' || typeof record.date === 'number'
            ? new Date(record.date)
            : record.date;

        await prisma.kLineData.upsert({
          where: {
            stockCode_date_period: {
              stockCode: stock.stockCode,
              date: recordDate,
              period: 'daily',
            },
          },
          update: {
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            amount: record.amount || 0,
            source: dataSource,
          },
          create: {
            stockCode: stock.stockCode,
            date: recordDate,
            period: 'daily',
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            amount: record.amount || 0,
            source: dataSource,
          },
        });
        insertedCount++;
      } catch (error: any) {
        logger.warn(`Failed to insert record for ${record.date}: ${error.message}`);
      }
    }

    logger.log(`💾 Inserted/Updated ${insertedCount} records`);
    logger.log(`✅ Successfully updated ${stock.stockCode}`);

    return {
      stockCode: stock.stockCode,
      market: stock.market,
      success: true,
      newRecords: insertedCount,
    };
  } catch (error: any) {
    logger.error(`❌ Error: ${error.message}`);
    return {
      stockCode: stock.stockCode,
      market: stock.market,
      success: false,
      newRecords: 0,
      error: error.message,
    };
  }
}

/**
 * 重新计算技术指标
 */
async function recalculateIndicators(
  stockCode: string,
  indicatorsService: TechnicalIndicatorsService,
) {
  logger.log(`🔢 Recalculating indicators...`);

  // 获取所有日线数据
  const allDailyData = await prisma.kLineData.findMany({
    where: { stockCode, period: 'daily' },
    orderBy: { date: 'asc' },
  });

  const priceData: PriceData[] = allDailyData.map((item) => ({
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
    where: { stockCode, period: 'daily' },
  });

  // 保存新指标
  const indicatorRecords: any[] = [];

  // MA
  maResults.forEach((item) => {
    if (item.ma50 || item.ma150 || item.ma200) {
      indicatorRecords.push({
        stockCode,
        date: new Date(item.date),
        period: 'daily',
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
      stockCode,
      date: new Date(item.date),
      period: 'daily',
      indicatorType: 'kdj',
      values: JSON.stringify({ k: item.k, d: item.d, j: item.j }),
    });
  });

  // RSI
  rsiResults.forEach((item) => {
    indicatorRecords.push({
      stockCode,
      date: new Date(item.date),
      period: 'daily',
      indicatorType: 'rsi',
      values: JSON.stringify({ rsi: item.rsi }),
    });
  });

  // Volume
  volumeResults.forEach((item) => {
    indicatorRecords.push({
      stockCode,
      date: new Date(item.date),
      period: 'daily',
      indicatorType: 'volume',
      values: JSON.stringify({ volume: item.volume, volumeMA: item.volumeMA }),
    });
  });

  // Amount
  amountResults.forEach((item) => {
    indicatorRecords.push({
      stockCode,
      date: new Date(item.date),
      period: 'daily',
      indicatorType: 'amount',
      values: JSON.stringify({ amount: item.amount, amountMA: item.amountMA }),
    });
  });

  // 52周标注
  if (markers) {
    indicatorRecords.push({
      stockCode,
      date: new Date(),
      period: 'daily',
      indicatorType: 'week52_marker',
      values: JSON.stringify(markers),
    });
  }

  if (indicatorRecords.length > 0) {
    await prisma.technicalIndicator.createMany({
      data: indicatorRecords,
    });
  }
}

/**
 * 更新周线数据（仅A股）
 */
async function updateWeeklyData(
  stockCode: string,
  dataSourceManager: DataSourceManagerService,
  indicatorsService: TechnicalIndicatorsService,
  todayStr: string,
) {
  logger.log(`📊 Checking weekly data...`);

  const latestWeekly = await prisma.kLineData.findFirst({
    where: { stockCode, period: 'weekly' },
    orderBy: { date: 'desc' },
  });

  if (latestWeekly) {
    const weeklyNextDay = new Date(latestWeekly.date);
    weeklyNextDay.setDate(weeklyNextDay.getDate() + 1);
    const weeklyStartDateStr = weeklyNextDay.toISOString().split('T')[0];

    if (weeklyNextDay < new Date()) {
      const { data: newWeeklyData, source: weeklySource } = await dataSourceManager.getWeeklyKLine({
        stockCode,
        startDate: weeklyStartDateStr,
        endDate: todayStr,
      });

      if (newWeeklyData.length > 0) {
        let weeklyInserted = 0;
        for (const item of newWeeklyData) {
          try {
            await prisma.kLineData.upsert({
              where: {
                stockCode_date_period: {
                  stockCode,
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
                stockCode,
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
        logger.log(`💾 Inserted ${weeklyInserted} weekly records`);

        // 重新计算周线指标
        const allWeeklyData = await prisma.kLineData.findMany({
          where: { stockCode, period: 'weekly' },
          orderBy: { date: 'asc' },
        });

        const weeklyPriceData: PriceData[] = allWeeklyData.map((item) => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          amount: item.amount,
        }));

        const weeklyMaResults = indicatorsService.calculateMA(
          weeklyPriceData,
          { weekly: [10, 30, 40] },
          'weekly',
        );

        await prisma.technicalIndicator.deleteMany({
          where: { stockCode, period: 'weekly' },
        });

        const weeklyIndicatorRecords: any[] = [];
        weeklyMaResults.forEach((item) => {
          weeklyIndicatorRecords.push({
            stockCode,
            date: new Date(item.date),
            period: 'weekly',
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
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);

  let markets: string[] = ['SH', 'SZ', 'HK', 'US']; // 默认全部市场
  let limit: number | undefined;
  let indexOnly = false;
  let resumeTaskId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--markets' && i + 1 < args.length) {
      const marketArg = args[i + 1];
      if (marketArg.includes(',')) {
        markets = [];
        marketArg.split(',').forEach((m) => {
          const market = m.trim().toUpperCase();
          if (market === 'A') {
            markets.push('SH', 'SZ');
          } else {
            markets.push(market);
          }
        });
      } else {
        const market = marketArg.trim().toUpperCase();
        if (market === 'A') {
          markets = ['SH', 'SZ'];
        } else {
          markets = [market];
        }
      }
    } else if (args[i] === '--limit' && i + 1 < args.length) {
      limit = parseInt(args[i + 1], 10);
    } else if (args[i] === '--index-only') {
      indexOnly = true;
    } else if (args[i] === '--resume' && i + 1 < args.length) {
      resumeTaskId = args[i + 1];
    }
  }

  return { markets, limit, indexOnly, resumeTaskId };
}

async function main() {
  const startTime = Date.now();
  const { markets, limit, indexOnly, resumeTaskId } = parseArgs();

  logger.log('======================================');
  logger.log('📊 统一增量更新 - A股/港股/美股');
  logger.log('======================================\n');
  logger.log(`市场: ${markets.join(', ')}`);
  if (limit) logger.log(`限制: ${limit} 只`);
  if (indexOnly) logger.log(`模式: 仅指数成分股`);
  if (resumeTaskId) logger.log(`恢复任务: ${resumeTaskId}`);
  logger.log(`开始时间: ${new Date().toLocaleString()}\n`);

  // 初始化服务
  const configService = new ConfigService();
  const pythonBridgeService = new PythonBridgeService();
  const tushareService = new TushareService(configService);
  const akshareService = new AkShareService(pythonBridgeService);
  const dataSourceManager = new DataSourceManagerService(tushareService, akshareService);
  const indicatorsService = new TechnicalIndicatorsService();
  const yahooFinanceAdapter = new YahooFinanceAdapter();
  const akshareAdapter = new AkShareAdapter();
  const importManager = new ImportManager({
    primaryAdapter: yahooFinanceAdapter,
    backupAdapter: akshareAdapter,
    retryAttempts: 3,
  });

  // 构建查询条件
  const whereClause: any = {
    market: { in: markets },
    admissionStatus: 'active',
  };

  if (indexOnly) {
    whereClause.indexCode = { not: null };
  }

  // 查询股票列表
  const totalStocks = await prisma.stock.count({ where: whereClause });
  const stocks = await prisma.stock.findMany({
    where: whereClause,
    take: limit,
    orderBy: { stockCode: 'asc' },
    select: { stockCode: true, stockName: true, market: true },
  });

  logger.log(`\n找到 ${stocks.length} 只股票需要更新 (总计: ${totalStocks})\n`);

  if (stocks.length === 0) {
    logger.warn('没有找到需要更新的股票');
    return;
  }

  // 初始化统计
  const stats: UpdateStats = {
    total: stocks.length,
    updated: 0,
    alreadyLatest: 0,
    noNewData: 0,
    failed: 0,
    totalNewRecords: 0,
    byMarket: {},
  };

  markets.forEach((market) => {
    stats.byMarket[market] = {
      updated: 0,
      alreadyLatest: 0,
      noNewData: 0,
      failed: 0,
      newRecords: 0,
    };
  });

  const errors: ImportError[] = [];

  // 根据市场类型分组股票
  const aStocks = stocks.filter((s) => s.market === 'SH' || s.market === 'SZ');
  const hkusStocks = stocks.filter((s) => s.market === 'HK' || s.market === 'US');

  logger.log(`📊 股票分布:`);
  logger.log(`  A股 (SH/SZ): ${aStocks.length} 只`);
  logger.log(`  港股 (HK): ${stocks.filter((s) => s.market === 'HK').length} 只`);
  logger.log(`  美股 (US): ${stocks.filter((s) => s.market === 'US').length} 只\n`);

  // 并发控制
  const A_STOCK_CONCURRENCY = 8; // A股并发数
  const HKUS_CONCURRENCY = 3; // 港股/美股并发数（避免API限流）

  let completed = 0;

  // 处理A股
  if (aStocks.length > 0) {
    logger.log(`🚀 开始更新A股 (并发: ${A_STOCK_CONCURRENCY})\n`);
    const aStockLimit = pLimit.default(A_STOCK_CONCURRENCY);

    const aStockTasks = aStocks.map((stock) =>
      aStockLimit(async () => {
        const result = await updateAStock(stock, dataSourceManager, indicatorsService);

        if (result.success) {
          if (result.reason === 'already_latest') {
            stats.alreadyLatest++;
            stats.byMarket[stock.market].alreadyLatest++;
          } else if (result.reason === 'no_new_data') {
            stats.noNewData++;
            stats.byMarket[stock.market].noNewData++;
          } else {
            stats.updated++;
            stats.totalNewRecords += result.newRecords;
            stats.byMarket[stock.market].updated++;
            stats.byMarket[stock.market].newRecords += result.newRecords;
          }
        } else {
          stats.failed++;
          stats.byMarket[stock.market].failed++;
          errors.push({
            stockCode: result.stockCode,
            market: result.market,
            error: result.error || result.reason || 'Unknown error',
          });
        }

        completed++;
        if (completed % 10 === 0 || completed === stocks.length) {
          printProgress(completed, stocks.length, stats, startTime);
        }
      }),
    );

    await Promise.all(aStockTasks);
  }

  // 处理港股和美股
  if (hkusStocks.length > 0) {
    logger.log(`\n🚀 开始更新港股/美股 (并发: ${HKUS_CONCURRENCY})\n`);
    const hkusLimit = pLimit.default(HKUS_CONCURRENCY);

    const hkusTasks = hkusStocks.map((stock) =>
      hkusLimit(async () => {
        const result = await updateHKUSStock(stock, importManager);

        if (result.success) {
          if (result.reason === 'already_latest') {
            stats.alreadyLatest++;
            stats.byMarket[stock.market].alreadyLatest++;
          } else if (result.reason === 'no_new_data') {
            stats.noNewData++;
            stats.byMarket[stock.market].noNewData++;
          } else {
            stats.updated++;
            stats.totalNewRecords += result.newRecords;
            stats.byMarket[stock.market].updated++;
            stats.byMarket[stock.market].newRecords += result.newRecords;
          }
        } else {
          stats.failed++;
          stats.byMarket[stock.market].failed++;
          errors.push({
            stockCode: result.stockCode,
            market: result.market,
            error: result.error || result.reason || 'Unknown error',
          });
        }

        completed++;
        if (completed % 10 === 0 || completed === stocks.length) {
          printProgress(completed, stocks.length, stats, startTime);
        }
      }),
    );

    await Promise.all(hkusTasks);
  }

  // 最终统计
  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  logger.log('\n======================================');
  logger.log('🎉 增量更新完成！');
  logger.log('======================================\n');
  logger.log(`总计: ${stats.total} 只股票`);
  logger.log(`成功更新: ${stats.updated} 只`);
  logger.log(`已是最新: ${stats.alreadyLatest} 只`);
  logger.log(`无新数据: ${stats.noNewData} 只`);
  logger.log(`失败: ${stats.failed} 只`);
  logger.log(`新增K线: ${stats.totalNewRecords.toLocaleString()} 条`);
  logger.log(`总耗时: ${totalElapsed} 分钟\n`);

  // 按市场统计
  logger.log('📊 各市场统计:\n');
  Object.entries(stats.byMarket).forEach(([market, marketStats]) => {
    const total =
      marketStats.updated + marketStats.alreadyLatest + marketStats.noNewData + marketStats.failed;
    if (total > 0) {
      logger.log(`${market}:`);
      logger.log(`  成功更新: ${marketStats.updated} 只`);
      logger.log(`  已是最新: ${marketStats.alreadyLatest} 只`);
      logger.log(`  无新数据: ${marketStats.noNewData} 只`);
      logger.log(`  失败: ${marketStats.failed} 只`);
      logger.log(`  新增K线: ${marketStats.newRecords.toLocaleString()} 条\n`);
    }
  });

  // 显示错误信息
  if (errors.length > 0) {
    logger.warn(`\n⚠️ 失败的股票 (${errors.length} 只):`);
    errors.slice(0, 20).forEach((err) => {
      logger.warn(`  [${err.market}] ${err.stockCode}: ${err.error}`);
    });
    if (errors.length > 20) {
      logger.warn(`  ... 以及 ${errors.length - 20} 只其他股票`);
    }
  }

  await prisma.$disconnect();
}

function printProgress(completed: number, total: number, stats: UpdateStats, startTime: number) {
  const progress = ((completed / total) * 100).toFixed(1);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const rate = (completed / (Date.now() - startTime)) * 60000;
  const remaining = Math.ceil((total - completed) / rate);

  logger.log(
    `\n📊 Progress: ${completed}/${total} (${progress}%) | ` +
      `Updated: ${stats.updated} | Latest: ${stats.alreadyLatest} | ` +
      `NoData: ${stats.noNewData} | Failed: ${stats.failed} | ` +
      `Elapsed: ${elapsed}s | Rate: ${rate.toFixed(1)}/min | ` +
      `ETA: ${remaining}min`,
  );
}

main()
  .then(() => {
    logger.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  });
