/**
 * 批量初始化指数成分股K线数据
 * 
 * 自动分批处理所有指数成分股（沪深300+中证1000）
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

const BATCH_SIZE = 500;
const PAUSE_BETWEEN_BATCHES = 30000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('======================================');
  console.log('📊 批量初始化指数成分股K线数据');
  console.log('======================================\n');

  const totalIndexStocks = await prisma.stock.count({
    where: { indexCode: { not: null } },
  });

  if (totalIndexStocks === 0) {
    console.log('⚠️ 没有指数成分股！请先运行:');
    console.log('   npx ts-node src/scripts/sync-index-members.ts\n');
    return;
  }

  const totalBatches = Math.ceil(totalIndexStocks / BATCH_SIZE);
  const estimatedHours = ((totalIndexStocks * 6.5) / 3600).toFixed(1);

  console.log(`指数成分股: ${totalIndexStocks} 只`);
  console.log(`批次大小: ${BATCH_SIZE}`);
  console.log(`预计批次: ${totalBatches}`);
  console.log(`预计耗时: ~${estimatedHours} 小时`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  let currentOffset = 0;
  let batchNum = 1;

  while (currentOffset < totalIndexStocks) {
    const currentBatchSize = Math.min(BATCH_SIZE, totalIndexStocks - currentOffset);

    console.log('======================================');
    console.log(`📦 批次 ${batchNum}/${totalBatches}`);
    console.log('======================================');
    console.log(`范围: ${currentOffset + 1} - ${currentOffset + currentBatchSize}`);
    console.log(`进度: ${((currentOffset / totalIndexStocks) * 100).toFixed(1)}%`);
    console.log(`开始时间: ${new Date().toLocaleTimeString()}\n`);

    try {
      const cmd = `npx ts-node src/scripts/init-index-stocks-klines.ts ${currentBatchSize} ${currentOffset}`;
      const { stdout, stderr } = await execPromise(cmd, {
        maxBuffer: 10 * 1024 * 1024,
        cwd: process.cwd(),
      });

      console.log(stdout);
      if (stderr) console.error('stderr:', stderr);
      console.log(`✅ 批次 ${batchNum} 完成\n`);
    } catch (error) {
      console.error(`❌ 批次 ${batchNum} 失败:`, error);
      console.log('\n继续处理下一批次...\n');
    }

    currentOffset += currentBatchSize;
    batchNum++;

    if (currentOffset < totalIndexStocks) {
      console.log(`⏸️  暂停 ${PAUSE_BETWEEN_BATCHES / 1000} 秒...\n`);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }

  console.log('\n======================================');
  console.log('🎉 批量初始化完成！');
  console.log('======================================\n');
  console.log(`结束时间: ${new Date().toLocaleString()}\n`);

  const klineCount = await prisma.kLineData.count();
  const dailyCount = await prisma.kLineData.count({ where: { period: 'daily' } });
  const weeklyCount = await prisma.kLineData.count({ where: { period: 'weekly' } });
  const indicatorCount = await prisma.technicalIndicator.count();

  const latestData = await prisma.kLineData.findFirst({
    where: { period: 'daily' },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  console.log('======================================');
  console.log('📊 数据库统计');
  console.log('======================================\n');
  console.log(`指数成分股: ${totalIndexStocks} 只\n`);
  console.log(`K线数据: ${klineCount.toLocaleString()} 条`);
  console.log(`  日线: ${dailyCount.toLocaleString()} 条`);
  console.log(`  周线: ${weeklyCount.toLocaleString()} 条\n`);
  console.log(`技术指标: ${indicatorCount.toLocaleString()} 条\n`);

  if (latestData) {
    console.log(`最新数据日期: ${new Date(latestData.date).toLocaleDateString('zh-CN')}\n`);
  }

  console.log('✨ 初始化完成！\n');
}

main()
  .catch((error) => {
    console.error('❌ 批量初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
