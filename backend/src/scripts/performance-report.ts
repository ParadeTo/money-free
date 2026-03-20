/**
 * 性能报告脚本
 *
 * 使用:
 * npx ts-node src/scripts/performance-report.ts
 * npx ts-node src/scripts/performance-report.ts --last 10
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PerformanceMetrics {
  avgDuration: number;
  avgSuccessRate: number;
  avgThroughput: number; // stocks per minute
  totalUpdates: number;
}

async function main() {
  const args = process.argv.slice(2);
  let limit = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--last' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 性能报告 - 最近 ${limit} 次更新`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const recentTasks = await prisma.updateLog.findMany({
      where: {
        status: 'completed',
        endTime: {
          not: null,
        },
      },
      orderBy: {
        endTime: 'desc',
      },
      take: limit,
    });

    if (recentTasks.length === 0) {
      console.log(`⚠️ 没有找到已完成的更新任务\n`);
      process.exit(0);
    }

    console.log(`任务列表:\n`);

    const metrics: PerformanceMetrics = {
      avgDuration: 0,
      avgSuccessRate: 0,
      avgThroughput: 0,
      totalUpdates: 0,
    };

    let totalDuration = 0;
    let totalSuccessRate = 0;
    let totalThroughput = 0;

    recentTasks.forEach((task, index) => {
      const duration = Math.round((task.endTime!.getTime() - task.startTime.getTime()) / 60000);
      const successRate = task.totalStocks
        ? Math.round((task.successCount! / task.totalStocks) * 100)
        : 0;
      const throughput = duration > 0 ? Math.round(task.totalStocks! / duration) : 0;

      console.log(`${index + 1}. ${task.startTime.toLocaleDateString('zh-CN')}`);
      console.log(`   用时: ${duration} 分钟`);
      console.log(`   成功率: ${successRate}%`);
      console.log(`   吞吐量: ${throughput} 只/分钟`);
      console.log(`   处理股票: ${task.successCount}/${task.totalStocks}`);
      console.log();

      totalDuration += duration;
      totalSuccessRate += successRate;
      totalThroughput += throughput;
    });

    metrics.avgDuration = Math.round(totalDuration / recentTasks.length);
    metrics.avgSuccessRate = Math.round(totalSuccessRate / recentTasks.length);
    metrics.avgThroughput = Math.round(totalThroughput / recentTasks.length);
    metrics.totalUpdates = recentTasks.length;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📈 平均指标:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`平均用时: ${metrics.avgDuration} 分钟`);
    console.log(`平均成功率: ${metrics.avgSuccessRate}%`);
    console.log(`平均吞吐量: ${metrics.avgThroughput} 只/分钟`);
    console.log();

    // 性能目标检查
    const targetDuration = 15; // 15分钟
    const targetSuccessRate = 95; // 95%

    if (metrics.avgDuration <= targetDuration) {
      console.log(`✅ 平均用时 ${metrics.avgDuration}分钟 ≤ 目标 ${targetDuration}分钟`);
    } else {
      console.log(`⚠️ 平均用时 ${metrics.avgDuration}分钟 > 目标 ${targetDuration}分钟`);
    }

    if (metrics.avgSuccessRate >= targetSuccessRate) {
      console.log(`✅ 平均成功率 ${metrics.avgSuccessRate}% ≥ 目标 ${targetSuccessRate}%`);
    } else {
      console.log(`⚠️ 平均成功率 ${metrics.avgSuccessRate}% < 目标 ${targetSuccessRate}%`);
    }

    console.log();
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ 生成报告失败: ${error.message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
