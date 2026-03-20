#!/usr/bin/env ts-node
/**
 * A股批量增量更新脚本
 *
 * 功能：
 * - 自动分批处理所有A股（SH+SZ）
 * - 每批100只股票
 * - 批次间自动等待60秒避免限流
 * - 显示总体进度和统计
 *
 * 使用：
 * npx ts-node src/scripts/update-a-shares-batch.ts
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;
const WAIT_BETWEEN_BATCHES = 65000; // 65秒

interface BatchResult {
  batchNum: number;
  processed: number;
  success: number;
  noData: number;
  failed: number;
  newRecords: number;
  elapsed: number;
}

async function runBatch(offset: number, limit: number): Promise<BatchResult | null> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'incremental-update-latest.ts');
    const node20Path = '/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin/node';
    const npxPath = '/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin/npx';

    console.log(`\n🚀 Starting batch at offset ${offset}...`);

    const proc = spawn(
      npxPath,
      ['ts-node', scriptPath, '--markets=SH,SZ', limit.toString(), offset.toString()],
      {
        cwd: path.join(__dirname, '..', '..'),
        stdio: 'pipe',
        env: {
          ...process.env,
          PATH: '/Users/youxingzhi/.nvm/versions/node/v20.19.5/bin:' + process.env.PATH,
        },
      },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // 只显示关键进度信息
      if (text.includes('Progress:') || text.includes('🎉')) {
        process.stdout.write(text);
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Batch failed with code ${code}`);
        console.error(stderr);
        resolve(null);
        return;
      }

      // 解析结果
      const successMatch = stdout.match(/成功更新: (\d+) 只/);
      const noDataMatch = stdout.match(/无新数据: (\d+) 只/);
      const failedMatch = stdout.match(/失败: (\d+) 只/);
      const newRecordsMatch = stdout.match(/新增K线: ([\d,]+) 条/);
      const elapsedMatch = stdout.match(/elapsed_ms: (\d+)/);

      resolve({
        batchNum: Math.floor(offset / limit) + 1,
        processed: limit,
        success: successMatch ? parseInt(successMatch[1]) : 0,
        noData: noDataMatch ? parseInt(noDataMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        newRecords: newRecordsMatch ? parseInt(newRecordsMatch[1].replace(/,/g, '')) : 0,
        elapsed: elapsedMatch ? parseInt(elapsedMatch[1]) : 0,
      });
    });
  });
}

async function main() {
  console.log('📊 A股批量增量更新开始...\n');

  // 查询A股总数
  const totalAShares = await prisma.stock.count({
    where: { market: { in: ['SH', 'SZ'] } },
  });

  console.log(`总共 ${totalAShares} 只A股需要更新`);
  const totalBatches = Math.ceil(totalAShares / BATCH_SIZE);
  console.log(`分 ${totalBatches} 批处理，每批 ${BATCH_SIZE} 只\n`);

  const startTime = Date.now();
  const allResults: BatchResult[] = [];

  for (let batch = 0; batch < totalBatches; batch++) {
    const offset = batch * BATCH_SIZE;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 批次 ${batch + 1}/${totalBatches} (offset: ${offset})`);
    console.log('='.repeat(60));

    const result = await runBatch(offset, BATCH_SIZE);

    if (result) {
      allResults.push(result);
      console.log(`\n✅ 批次 ${batch + 1} 完成：`);
      console.log(`   成功: ${result.success}, 无新数据: ${result.noData}, 失败: ${result.failed}`);
      console.log(`   新增K线: ${result.newRecords.toLocaleString()} 条`);
      console.log(`   耗时: ${(result.elapsed / 1000).toFixed(1)}秒`);
    } else {
      console.error(`\n❌ 批次 ${batch + 1} 失败`);
    }

    // 如果不是最后一批，等待一段时间
    if (batch < totalBatches - 1) {
      const waitSeconds = Math.ceil(WAIT_BETWEEN_BATCHES / 1000);
      console.log(`\n⏳ 等待 ${waitSeconds} 秒避免限流...`);
      await new Promise((resolve) => setTimeout(resolve, WAIT_BETWEEN_BATCHES));
      console.log('✅ 继续下一批');
    }
  }

  // 最终统计
  const totalElapsed = Date.now() - startTime;
  const totalSuccess = allResults.reduce((sum, r) => sum + r.success, 0);
  const totalNoData = allResults.reduce((sum, r) => sum + r.noData, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalNewRecords = allResults.reduce((sum, r) => sum + r.newRecords, 0);

  console.log('\n\n' + '='.repeat(60));
  console.log('🎉 全部批次完成！');
  console.log('='.repeat(60));
  console.log(`\n总计处理: ${totalAShares} 只A股`);
  console.log(`成功更新: ${totalSuccess} 只`);
  console.log(`无新数据: ${totalNoData} 只`);
  console.log(`失败: ${totalFailed} 只`);
  console.log(`新增K线: ${totalNewRecords.toLocaleString()} 条`);
  console.log(`总耗时: ${(totalElapsed / 1000 / 60).toFixed(1)} 分钟\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
