/**
 * 港股和美股增量更新脚本
 * 
 * 功能:
 * 1. 查询每只股票的最新K线数据日期
 * 2. 只获取从最新日期到今天的新数据
 * 3. 增量插入新数据（upsert）
 * 4. 支持断点续传
 * 
 * 使用:
 * npx ts-node src/scripts/incremental-update-hk-us.ts --markets HK,US
 * npx ts-node src/scripts/incremental-update-hk-us.ts --markets HK --limit 10
 * npx ts-node src/scripts/incremental-update-hk-us.ts --resume <taskId>
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import * as pLimit from 'p-limit';
import { ImportManager } from '../modules/market-data/import/import-manager';
import { YahooFinanceAdapter } from '../modules/market-data/data-source/yahoo-finance-adapter';
import { AkShareAdapter } from '../modules/market-data/data-source/akshare-adapter';
import { CheckpointTracker } from '../modules/market-data/import/checkpoint-tracker';
import { MarketType } from '../types/market-data';

interface ImportError {
  stockCode: string;
  error: string;
}

const prisma = new PrismaClient();
const logger = new Logger('IncrementalUpdateHKUS');

interface UpdateStats {
  total: number;
  updated: number;
  alreadyLatest: number;
  noNewData: number;
  failed: number;
  totalNewRecords: number;
}

interface StockUpdateResult {
  stockCode: string;
  success: boolean;
  newRecords: number;
  reason?: string;
  error?: string;
}

async function updateStock(
  stockCode: string,
  stockName: string,
  market: MarketType,
  importManager: ImportManager,
): Promise<StockUpdateResult> {
  try {
    logger.log(`\n--- Updating ${stockCode} (${stockName}) [${market}] ---`);

    // 1. 查询最新K线数据日期
    const latestRecord = await prisma.kLineData.findFirst({
      where: {
        stockCode,
        period: 'daily',
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!latestRecord) {
      logger.warn('⚠️ No existing data, please run full import first');
      return { stockCode, success: false, newRecords: 0, reason: 'no_existing_data' };
    }

    const latestDate = new Date(latestRecord.date);
    const today = new Date();

    // 比较日期（忽略时间部分）
    const latestDateStr = latestDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    logger.log(`📅 Latest data: ${latestDateStr}`);

    // 如果已经是最新，跳过
    if (latestDateStr >= todayStr) {
      logger.log('✅ Data is already up to date');
      return { stockCode, success: true, newRecords: 0, reason: 'already_latest' };
    }

    // 计算需要更新的日期范围
    const nextDay = new Date(latestDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const startDateStr = nextDay.toISOString().split('T')[0];

    logger.log(`📥 Fetching incremental data: ${startDateStr} to ${todayStr}`);

    // 2. 获取增量K线数据
    const klineResult = await importManager.fetchKlineDataWithFallback(
      stockCode,
      market,
      startDateStr,
      todayStr,
    );

    if (!klineResult.data || klineResult.data.length === 0) {
      logger.log('⚠️ No new data available');
      return { stockCode, success: true, newRecords: 0, reason: 'no_new_data' };
    }

    const klineData = klineResult.data;
    const dataSource = klineResult.source || 'yahoo_finance';
    logger.log(`✅ Fetched ${klineData.length} new records (source: ${dataSource})`);

    // 3. 增量插入K线数据
    let insertedCount = 0;
    for (const record of klineData) {
      try {
        await prisma.kLineData.upsert({
          where: {
            stockCode_date_period: {
              stockCode,
              date: record.date,
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
            stockCode,
            date: record.date,
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
    logger.log(`✅ Successfully updated ${stockCode}`);

    return { stockCode, success: true, newRecords: insertedCount };
  } catch (error: any) {
    logger.error(`❌ Error updating ${stockCode}: ${error.message}`);
    return { stockCode, success: false, newRecords: 0, error: error.message };
  }
}

async function main() {
  const startTime = Date.now();

  // 解析命令行参数
  const args = process.argv.slice(2);
  let markets: MarketType[] = [MarketType.HK, MarketType.US];
  let limit: number | undefined;
  let resumeTaskId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--markets' && i + 1 < args.length) {
      markets = args[i + 1].split(',').map(m => m.trim().toUpperCase()) as MarketType[];
    } else if (args[i] === '--limit' && i + 1 < args.length) {
      limit = parseInt(args[i + 1], 10);
    } else if (args[i] === '--resume' && i + 1 < args.length) {
      resumeTaskId = args[i + 1];
    }
  }

  logger.log(`📊 Starting incremental update for ${markets.join(', ')}`);
  if (limit) logger.log(`📝 Limit: ${limit} stocks`);
  if (resumeTaskId) logger.log(`🔄 Resuming from checkpoint: ${resumeTaskId}`);

  // 初始化服务
  const yahooFinanceAdapter = new YahooFinanceAdapter();
  const akshareAdapter = new AkShareAdapter();

  // HK使用Yahoo Finance主，AkShare备
  // US使用Yahoo Finance主，无备用
  const importManager = new ImportManager({
    primaryAdapter: yahooFinanceAdapter,
    backupAdapter: akshareAdapter,
    retryAttempts: 3,
  });

  // 检查点追踪器
  const checkpointTracker = new CheckpointTracker(prisma);

  // 生成任务ID
  const taskId = resumeTaskId || `incremental-${Date.now()}`;

  // 查询需要更新的股票
  const whereClause: any = {
    market: { in: markets },
    admissionStatus: 'active',
  };

  const totalStocks = await prisma.stock.count({ where: whereClause });
  const stocks = await prisma.stock.findMany({
    where: whereClause,
    take: limit,
    orderBy: { stockCode: 'asc' },
    select: { stockCode: true, stockName: true, market: true },
  });

  logger.log(`\nFound ${stocks.length} stocks to update (total: ${totalStocks})\n`);

  if (stocks.length === 0) {
    logger.warn('No stocks found to update');
    return;
  }

  // 创建或恢复检查点
  let checkpoint;
  if (resumeTaskId) {
    checkpoint = await checkpointTracker.getCheckpoint(resumeTaskId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${resumeTaskId} not found`);
    }
    logger.log(`🔄 Resuming from checkpoint (${checkpoint.importedStocks}/${checkpoint.totalStocks} completed)`);
    await checkpointTracker.resumeCheckpoint(resumeTaskId);
  } else {
    // 使用第一个市场作为checkpoint的market（因为只支持单市场）
    const primaryMarket = markets[0] as 'HK' | 'US';
    checkpoint = await checkpointTracker.createCheckpoint(
      taskId,
      primaryMarket,
      'incremental',
      stocks.length,
    );
  }

  // 统计
  const stats: UpdateStats = {
    total: stocks.length,
    updated: 0,
    alreadyLatest: 0,
    noNewData: 0,
    failed: 0,
    totalNewRecords: 0,
  };

  const errors: ImportError[] = [];

  // 并发控制：同时处理3只股票（避免API限流）
  const concurrencyLimit = pLimit.default(3);
  let completed = checkpoint.importedStocks || 0;

  const tasks = stocks.map((stock, index) =>
    concurrencyLimit(async () => {
      // 跳过已处理的股票
      if (index < (checkpoint.importedStocks || 0)) {
        return;
      }

      const result = await updateStock(
        stock.stockCode,
        stock.stockName,
        stock.market as MarketType,
        importManager,
      );

      if (result.success) {
        if (result.reason === 'already_latest') {
          stats.alreadyLatest++;
        } else if (result.reason === 'no_new_data') {
          stats.noNewData++;
        } else {
          stats.updated++;
          stats.totalNewRecords += result.newRecords;
        }
      } else {
        stats.failed++;
        const errorMsg = result.error || result.reason || 'Unknown error';
        errors.push({
          stockCode: result.stockCode,
          error: errorMsg,
        });
        // 记录失败
        await checkpointTracker.recordFailure(taskId, result.stockCode, errorMsg);
      }

      completed++;

      // 更新检查点（每10只股票更新一次）
      if (completed % 10 === 0 || completed === stocks.length) {
        await checkpointTracker.updateProgress(taskId, completed);

        const progress = ((completed / stocks.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (completed / (Date.now() - startTime)) * 60000;
        const remaining = Math.ceil((stocks.length - completed) / rate);

        logger.log(
          `\n📊 Progress: ${completed}/${stocks.length} (${progress}%) | ` +
          `Updated: ${stats.updated} | Latest: ${stats.alreadyLatest} | ` +
          `NoData: ${stats.noNewData} | Failed: ${stats.failed} | ` +
          `Elapsed: ${elapsed}s | Rate: ${rate.toFixed(1)}/min | ` +
          `ETA: ${remaining}min`
        );
      }
    })
  );

  await Promise.all(tasks);

  // 完成检查点
  await checkpointTracker.completeCheckpoint(taskId);

  // 最终统计
  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  logger.log('\n======================================');
  logger.log('🎉 增量更新完成！');
  logger.log('======================================\n');
  logger.log(`市场: ${markets.join(', ')}`);
  logger.log(`处理股票: ${stats.total} 只`);
  logger.log(`成功更新: ${stats.updated} 只`);
  logger.log(`已是最新: ${stats.alreadyLatest} 只`);
  logger.log(`无新数据: ${stats.noNewData} 只`);
  logger.log(`失败: ${stats.failed} 只`);
  logger.log(`新增K线: ${stats.totalNewRecords.toLocaleString()} 条`);
  logger.log(`总耗时: ${totalElapsed} 分钟\n`);

  if (errors.length > 0) {
    logger.warn(`\n⚠️ 失败的股票 (${errors.length} 只):`);
    errors.slice(0, 10).forEach((err) => {
      logger.warn(`  - ${err.stockCode}: ${err.error}`);
    });
    if (errors.length > 10) {
      logger.warn(`  ... 以及 ${errors.length - 10} 只其他股票`);
    }
  }

  await prisma.$disconnect();
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
