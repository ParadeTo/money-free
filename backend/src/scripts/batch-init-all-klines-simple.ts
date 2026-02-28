/**
 * 自动化批量初始化所有股票K线数据（TypeScript版本）
 * 
 * 功能:
 * - 自动分批处理所有股票
 * - 避免API限流
 * - 显示总体进度
 * 
 * 使用:
 * npx ts-node src/scripts/batch-init-all-klines-simple.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

// 配置参数
const BATCH_SIZE = 500;              // 每批处理数量
const PAUSE_BETWEEN_BATCHES = 30000; // 批次间暂停毫秒数（30秒）

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('======================================');
  console.log('📊 自动批量初始化K线数据');
  console.log('======================================\n');

  // 获取总股票数和已处理数量
  const totalStocks = await prisma.stock.count();
  const processedStocks = await prisma.kLineData.groupBy({
    by: ['stockCode'],
    _count: { stockCode: true },
  });
  const alreadyProcessed = processedStocks.length;
  const remaining = totalStocks - alreadyProcessed;

  console.log(`总股票数: ${totalStocks}`);
  console.log(`已处理: ${alreadyProcessed}`);
  console.log(`待处理: ${remaining}`);
  console.log(`批次大小: ${BATCH_SIZE}`);
  console.log(`预计批次: ${Math.ceil(remaining / BATCH_SIZE)}\n`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  if (remaining === 0) {
    console.log('✅ 所有股票数据已处理完成！');
    return;
  }

  let currentOffset = alreadyProcessed;
  let batchNum = 1;
  let successCount = 0;
  let failedCount = 0;

  while (currentOffset < totalStocks) {
    const currentBatchSize = Math.min(BATCH_SIZE, totalStocks - currentOffset);
    const totalBatches = Math.ceil(remaining / BATCH_SIZE);

    console.log('======================================');
    console.log(`📦 批次 ${batchNum}/${totalBatches}`);
    console.log('======================================');
    console.log(`范围: ${currentOffset + 1} - ${currentOffset + currentBatchSize}`);
    console.log(`进度: ${((currentOffset / totalStocks) * 100).toFixed(1)}%`);
    console.log(`开始时间: ${new Date().toLocaleTimeString()}\n`);

    try {
      // 执行批次脚本
      const { stdout, stderr } = await execPromise(
        `npx ts-node src/scripts/fetch-batch-klines.ts ${currentBatchSize} ${currentOffset}`,
        { 
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          cwd: process.cwd()
        }
      );

      console.log(stdout);
      if (stderr) {
        console.error('stderr:', stderr);
      }

      console.log(`✅ 批次 ${batchNum} 完成\n`);
      successCount += currentBatchSize;
    } catch (error) {
      console.error(`❌ 批次 ${batchNum} 失败:`, error);
      failedCount += currentBatchSize;
      
      // 询问是否继续（在生产环境可以自动继续）
      console.log('\n继续处理下一批次...\n');
    }

    // 更新偏移量
    currentOffset += currentBatchSize;
    batchNum++;

    // 如果还有下一批次，暂停避免API限流
    if (currentOffset < totalStocks) {
      console.log(`⏸️  暂停 ${PAUSE_BETWEEN_BATCHES / 1000} 秒以避免API限流...\n`);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }

  // 最终统计
  console.log('\n======================================');
  console.log('🎉 批量处理完成！');
  console.log('======================================\n');
  console.log(`总股票数: ${totalStocks}`);
  console.log(`已处理: ${alreadyProcessed + successCount}`);
  console.log(`本次成功: ${successCount}`);
  console.log(`本次失败: ${failedCount}\n`);
  console.log(`结束时间: ${new Date().toLocaleString()}\n`);

  // 数据库统计
  const klineCount = await prisma.kLineData.count();
  const dailyCount = await prisma.kLineData.count({ where: { period: 'daily' } });
  const weeklyCount = await prisma.kLineData.count({ where: { period: 'weekly' } });
  const indicatorCount = await prisma.technicalIndicator.count();

  console.log('======================================');
  console.log('📊 数据库统计');
  console.log('======================================\n');
  console.log(`股票数量: ${totalStocks} 只\n`);
  console.log(`K线数据: ${klineCount} 条`);
  console.log(`  日线: ${dailyCount} 条`);
  console.log(`  周线: ${weeklyCount} 条\n`);
  console.log(`技术指标: ${indicatorCount} 条\n`);
  console.log('✨ 数据初始化完成！可以启动应用进行测试了。\n');
}

main()
  .catch((error) => {
    console.error('❌ 自动化脚本失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
