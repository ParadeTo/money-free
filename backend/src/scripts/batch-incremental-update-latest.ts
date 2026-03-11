/**
 * 批量增量更新股票最新数据
 * 
 * 默认只更新指数成分股（沪深300+中证500，约800只）
 * 使用 --all 更新全部股票
 * 
 * 使用:
 * npx ts-node src/scripts/batch-incremental-update-latest.ts            # 只更新指数成分股
 * npx ts-node src/scripts/batch-incremental-update-latest.ts --all      # 更新全部股票
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

const updateAll = process.argv.includes('--all');
const indexOnlyFlag = updateAll ? '' : '--index-only';

const BATCH_SIZE = 500;
const PAUSE_BETWEEN_BATCHES = 30000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const mode = updateAll ? '全部股票' : '指数成分股 (沪深300+中证500)';
  console.log('======================================');
  console.log(`📊 批量增量更新K线数据 [${mode}]`);
  console.log('======================================\n');

  const totalStocks = await prisma.stock.count();
  
  let targetCount: number;
  if (updateAll) {
    targetCount = totalStocks;
  } else {
    targetCount = await prisma.stock.count({
      where: { indexCode: { not: null } },
    });
  }

  if (targetCount === 0) {
    if (!updateAll) {
      console.log('⚠️ 没有标记的指数成分股！请先运行:');
      console.log('   npx ts-node src/scripts/sync-index-members.ts\n');
    } else {
      console.log('⚠️ 数据库没有股票数据！');
    }
    return;
  }

  const totalBatches = Math.ceil(targetCount / BATCH_SIZE);
  const estimatedHours = ((targetCount * 5.8) / 3600).toFixed(1);

  console.log(`数据库总股票: ${totalStocks}`);
  console.log(`本次更新: ${targetCount} 只`);
  console.log(`批次大小: ${BATCH_SIZE}`);
  console.log(`预计批次: ${totalBatches}`);
  console.log(`预计耗时: ~${estimatedHours} 小时`);
  console.log(`开始时间: ${new Date().toLocaleString()}\n`);

  let currentOffset = 0;
  let batchNum = 1;

  while (currentOffset < targetCount) {
    const currentBatchSize = Math.min(BATCH_SIZE, targetCount - currentOffset);

    console.log('======================================');
    console.log(`📦 批次 ${batchNum}/${totalBatches}`);
    console.log('======================================');
    console.log(`范围: ${currentOffset + 1} - ${currentOffset + currentBatchSize}`);
    console.log(`进度: ${((currentOffset / targetCount) * 100).toFixed(1)}%`);
    console.log(`开始时间: ${new Date().toLocaleTimeString()}\n`);

    try {
      const cmd = `npx ts-node src/scripts/incremental-update-latest.ts ${currentBatchSize} ${currentOffset} ${indexOnlyFlag}`;
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

    if (currentOffset < targetCount) {
      console.log(`⏸️  暂停 ${PAUSE_BETWEEN_BATCHES / 1000} 秒...\n`);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }

  // 最终统计
  console.log('\n======================================');
  console.log('🎉 批量增量更新完成！');
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
  console.log(`更新股票: ${targetCount} 只\n`);
  console.log(`K线数据: ${klineCount.toLocaleString()} 条`);
  console.log(`  日线: ${dailyCount.toLocaleString()} 条`);
  console.log(`  周线: ${weeklyCount.toLocaleString()} 条\n`);
  console.log(`技术指标: ${indicatorCount.toLocaleString()} 条\n`);

  if (latestData) {
    console.log(`最新数据日期: ${new Date(latestData.date).toLocaleDateString('zh-CN')}\n`);
  }

  console.log('📡 开始 VCP 扫描计算...\n');
  try {
    const { stdout: vcpOut, stderr: vcpErr } = await execPromise(
      'npx ts-node src/scripts/calculate-vcp.ts',
      { maxBuffer: 10 * 1024 * 1024, cwd: process.cwd() },
    );
    if (vcpOut) console.log(vcpOut);
    if (vcpErr) console.error(vcpErr);
    console.log('✅ VCP 扫描计算完成\n');
  } catch (vcpError) {
    console.error('⚠️ VCP 扫描计算失败:', vcpError);
  }

  console.log('✨ 增量更新完成！\n');
}

main()
  .catch((error) => {
    console.error('❌ 批量更新失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
