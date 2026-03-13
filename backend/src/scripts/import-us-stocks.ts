/**
 * 美股数据导入脚本
 * 支持从标普500和纳斯达克100导入核心美股数据
 * 
 * 用法:
 *   ts-node src/scripts/import-us-stocks.ts [options]
 * 
 * 选项:
 *   --index <SP500|NDX100|all>  指定要导入的指数 (默认: all)
 *   --years <number>            历史数据年数 (默认: 10)
 *   --resume                    从上次中断处恢复
 *   --concurrency <number>      并发数 (默认: 3)
 *   --dry-run                   试运行，不写入数据库
 *   --verbose                   详细日志
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { AkShareAdapter } from '../modules/market-data/data-source/akshare-adapter';
import { YahooFinanceAdapter } from '../modules/market-data/data-source/yahoo-finance-adapter';
import { ImportManager } from '../modules/market-data/import/import-manager';
import { CheckpointTracker } from '../modules/market-data/import/checkpoint-tracker';
import { IndexCompositionService, US_INDICES } from '../modules/market-data/import/index-composition';
import { createRateLimiter } from '../modules/market-data/utils/rate-limiter';
import { MarketType } from '../types/market-data';

const prisma = new PrismaClient();

interface ImportOptions {
  index: 'SP500' | 'NDX100' | 'all';
  years: number;
  resume: boolean;
  concurrency: number;
  dryRun: boolean;
  verbose: boolean;
}

interface ImportStats {
  totalStocks: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{
    stockCode: string;
    stockName: string;
    errors: any[];
  }>;
}

function parseArguments(): ImportOptions {
  const args = process.argv.slice(2);
  const options: ImportOptions = {
    index: 'all',
    years: 10,
    resume: false,
    concurrency: 3,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--index':
        options.index = args[++i] as any;
        break;
      case '--years':
        options.years = parseInt(args[++i]);
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--concurrency':
        options.concurrency = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  return options;
}

async function importUSStocks() {
  const options = parseArguments();
  const taskId = `us-import-${Date.now()}`;

  console.log('🇺🇸 美股数据导入工具\n');
  console.log('配置:');
  console.log(`  指数: ${options.index}`);
  console.log(`  历史数据: ${options.years} 年`);
  console.log(`  并发数: ${options.concurrency}`);
  console.log(`  试运行: ${options.dryRun ? '是' : '否'}`);
  console.log(`  恢复导入: ${options.resume ? '是' : '否'}\n`);

  const yahooAdapter = new YahooFinanceAdapter();
  const akshareAdapter = new AkShareAdapter();
  const importManager = new ImportManager({
    primaryAdapter: yahooAdapter,
    backupAdapter: akshareAdapter,
    retryAttempts: 3,
  });
  const checkpointTracker = new CheckpointTracker(prisma);
  const indexService = new IndexCompositionService(importManager);

  const stats: ImportStats = {
    totalStocks: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    startTime: new Date(),
    errors: [],
  };

  try {
    console.log('📋 Step 1: 获取指数成分股列表...\n');

    const { constituents, stats: indexStats } = await indexService.fetchUSConstituents();

    console.log(`\n✅ 获取到 ${constituents.length} 只唯一美股`);
    console.log('   详情:', indexStats.byIndex);

    if (constituents.length === 0) {
      console.error('\n❌ 错误: 未获取到任何美股成分股');
      process.exit(1);
    }

    stats.totalStocks = constituents.length;

    let checkpoint = null;
    let importedStockCodes: string[] = [];

    if (options.resume) {
      console.log('\n🔄 检查是否有未完成的导入任务...');
      const activeCheckpoints = await checkpointTracker.listActiveCheckpoints();
      const usCheckpoint = activeCheckpoints.find((c) => c.market === 'US');

      if (usCheckpoint) {
        checkpoint = await checkpointTracker.resumeCheckpoint(usCheckpoint.taskId);
        importedStockCodes = await checkpointTracker.getImportedStocks(usCheckpoint.taskId);
        console.log(`✅ 恢复任务 ${usCheckpoint.taskId}`);
        console.log(`   已导入: ${importedStockCodes.length}/${usCheckpoint.totalStocks}`);
        stats.skippedCount = importedStockCodes.length;
      } else {
        console.log('   未找到可恢复的任务，将创建新任务');
      }
    }

    if (!checkpoint && !options.dryRun) {
      checkpoint = await checkpointTracker.createCheckpoint(
        taskId,
        'US',
        'full',
        constituents.length,
      );
    }

    console.log('\n📊 Step 2: 导入股票基本信息和K线数据...\n');
    console.log(`🚀 并行处理模式：${options.concurrency} 个并发任务\n`);

    const rateLimiter = createRateLimiter({
      concurrency: options.concurrency,
      intervalMs: 1000,
      requestsPerInterval: options.concurrency,
    });

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - options.years * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    let processedCount = 0;

    // 过滤掉已导入的股票
    const stocksToImport = constituents.filter((constituent) => {
      const stockCode = indexService.formatStockCode(constituent.code, 'US');
      return !importedStockCodes.includes(stockCode);
    });

    // 并行处理
    const tasks = stocksToImport.map((constituent, index) => 
      rateLimiter(async () => {
        const stockCode = indexService.formatStockCode(constituent.code, 'US');
        processedCount++;
        const currentIndex = index + 1 + importedStockCodes.length;
        try {
          console.log(`[${currentIndex}/${stats.totalStocks}] Processing ${stockCode} (${constituent.name})...`);

          const stockInfoResult = await importManager.fetchStockInfoWithFallback(
            constituent.code,
            MarketType.US,
          );

          if (!stockInfoResult.data) {
            console.error(`  ✗ 获取基本信息失败:`, stockInfoResult.errors);
            stats.failedCount++;
            stats.errors.push({
              stockCode,
              stockName: constituent.name,
              errors: stockInfoResult.errors,
            });

            if (!options.dryRun && checkpoint) {
              await checkpointTracker.recordFailure(
                checkpoint.taskId,
                stockCode,
                JSON.stringify(stockInfoResult.errors),
              );
            }
            return;
          }

          const klineResult = await importManager.fetchKlineDataWithFallback(
            constituent.code,
            MarketType.US,
            startDate,
            endDate,
          );

          if (!klineResult.data || klineResult.data.length === 0) {
            console.error(`  ✗ 获取K线数据失败:`, klineResult.errors);
            stats.failedCount++;
            stats.errors.push({
              stockCode,
              stockName: constituent.name,
              errors: klineResult.errors,
            });

            if (!options.dryRun && checkpoint) {
              await checkpointTracker.recordFailure(
                checkpoint.taskId,
                stockCode,
                JSON.stringify(klineResult.errors),
              );
            }
            return;
          }

          if (!options.dryRun) {
            await prisma.stock.upsert({
              where: { stockCode },
              update: {
                stockName: stockInfoResult.data.name,
                market: 'US',
                currency: 'USD',
                industry: stockInfoResult.data.industry,
                updatedAt: new Date(),
              },
              create: {
                stockCode,
                stockName: stockInfoResult.data.name,
                market: 'US',
                currency: 'USD',
                industry: stockInfoResult.data.industry,
                listDate: new Date(stockInfoResult.data.listDate),
                marketCap: stockInfoResult.data.marketCap,
                admissionStatus: 'active',
              },
            });

            const klineData = klineResult.data.map((k) => ({
              stockCode,
              date: new Date(k.date),
              period: 'daily',
              open: k.open,
              high: k.high,
              low: k.low,
              close: k.close,
              volume: k.volume,
              amount: k.amount,
              source: klineResult.source || 'yahoo_finance',
            }));

            for (const kline of klineData) {
              await prisma.kLineData.upsert({
                where: {
                  stockCode_date_period: {
                    stockCode: kline.stockCode,
                    date: kline.date,
                    period: kline.period,
                  },
                },
                update: kline,
                create: kline,
              });
            }

            if (checkpoint) {
              await checkpointTracker.updateProgress(
                checkpoint.taskId,
                processedCount + 1,
              );
            }
          }

          stats.successCount++;
          console.log(
            `  ✓ 成功 (${klineResult.data.length} K线记录, 来源: ${stockInfoResult.source})`,
          );
        } catch (error) {
          console.error(`  ✗ 错误:`, error);
          stats.failedCount++;
          stats.errors.push({
            stockCode,
            stockName: constituent.name,
            errors: [{ error: error instanceof Error ? error.message : String(error) }],
          });
        } finally {
          // processedCount is already incremented at the start
        }
      })
    );

    // 执行所有并行任务
    await Promise.all(tasks);

    stats.endTime = new Date();

    if (!options.dryRun && checkpoint) {
      await checkpointTracker.completeCheckpoint(checkpoint.taskId);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 导入完成统计\n');
    console.log(`总股票数: ${stats.totalStocks}`);
    console.log(`成功: ${stats.successCount}`);
    console.log(`失败: ${stats.failedCount}`);
    console.log(`跳过: ${stats.skippedCount}`);
    console.log(`耗时: ${((stats.endTime!.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)}秒`);

    if (stats.errors.length > 0) {
      console.log('\n❌ 失败详情:');
      stats.errors.forEach((err) => {
        console.log(`  - ${err.stockCode} (${err.stockName})`);
        console.log(`    ${JSON.stringify(err.errors)}`);
      });

      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(
        logDir,
        `import-us-stocks-${stats.startTime.toISOString().split('T')[0]}.json`,
      );
      fs.writeFileSync(logFile, JSON.stringify(stats, null, 2));
      console.log(`\n📝 详细日志已保存到: ${logFile}`);
    }

    console.log('='.repeat(60));

    const exitCode = stats.failedCount > 0 ? 2 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ 导入过程发生致命错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importUSStocks();
