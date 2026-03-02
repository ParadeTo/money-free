/**
 * 批量增量更新包装脚本
 * 
 * 功能: 自动分批调用增量更新脚本，支持断点续传
 * 
 * 使用:
 * npx ts-node src/scripts/batch-incremental-update.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

const BATCH_SIZE = 100; // 每批处理100只（增量更新较快）
const PAUSE_BETWEEN_BATCHES = 10000; // 批次间暂停10秒

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('======================================');
  console.log('📊 批量增量更新（补充缺失数据）');
  console.log('======================================\n');

  const totalStocks = await prisma.stock.count();
  console.log(`总股票数: ${totalStocks}`);
  console.log(`批次大小: ${BATCH_SIZE}`);
  console.log(`预计批次: ${Math.ceil(totalStocks / BATCH_SIZE)}\n`);
  console.log(`目标: 补充2016-2022和2024-2026的数据`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  let currentOffset = 0;
  let batchNum = 1;
  const totalBatches = Math.ceil(totalStocks / BATCH_SIZE);

  while (currentOffset < totalStocks) {
    const currentBatchSize = Math.min(BATCH_SIZE, totalStocks - currentOffset);

    console.log('======================================');
    console.log(`📦 批次 ${batchNum}/${totalBatches}`);
    console.log('======================================');
    console.log(`范围: ${currentOffset + 1} - ${currentOffset + currentBatchSize}`);
    console.log(`进度: ${((currentOffset / totalStocks) * 100).toFixed(1)}%`);
    console.log(`开始时间: ${new Date().toLocaleTimeString()}\n`);

    try {
      const { stdout, stderr } = await execPromise(
        `npx ts-node src/scripts/incremental-update-klines.ts ${currentBatchSize} ${currentOffset}`,
        { 
          maxBuffer: 10 * 1024 * 1024,
          cwd: process.cwd()
        }
      );

      console.log(stdout);
      if (stderr) {
        console.error('stderr:', stderr);
      }

      console.log(`✅ 批次 ${batchNum} 完成\n`);
    } catch (error) {
      console.error(`❌ 批次 ${batchNum} 失败:`, error);
      console.log('\n继续处理下一批次...\n');
    }

    currentOffset += currentBatchSize;
    batchNum++;

    if (currentOffset < totalStocks) {
      console.log(`⏸️  暂停 ${PAUSE_BETWEEN_BATCHES / 1000} 秒...\n`);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }

  console.log('\n======================================');
  console.log('🎉 批量增量更新完成！');
  console.log('======================================\n');
  console.log(`结束时间: ${new Date().toLocaleString()}\n`);

  // 最终统计
  const klineCount = await prisma.kLineData.count();
  const dailyCount = await prisma.kLineData.count({ where: { period: 'daily' } });
  const weeklyCount = await prisma.kLineData.count({ where: { period: 'weekly' } });
  const indicatorCount = await prisma.technicalIndicator.count();

  console.log('📊 最终数据统计:');
  console.log(`K线数据: ${klineCount.toLocaleString()} 条`);
  console.log(`  日线: ${dailyCount.toLocaleString()} 条`);
  console.log(`  周线: ${weeklyCount.toLocaleString()} 条`);
  console.log(`技术指标: ${indicatorCount.toLocaleString()} 条\n`);
}

main()
  .catch((error) => {
    console.error('❌ 批量更新失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
