/**
 * 任务状态查询脚本
 *
 * 使用:
 * npx ts-node src/scripts/task-status.ts
 * npx ts-node src/scripts/task-status.ts --task-id abc-123
 */

import { PrismaClient } from '@prisma/client';
import { CheckpointManager } from './checkpoint-manager';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let taskId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task-id' && args[i + 1]) {
      taskId = args[i + 1];
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 任务状态查询`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    if (taskId) {
      // 查询特定任务
      const checkpointManager = new CheckpointManager(prisma);
      const checkpoints = await prisma.importCheckpoint.findMany({
        where: { taskId },
      });

      if (checkpoints.length === 0) {
        console.log(`❌ 未找到任务: ${taskId}\n`);
        process.exit(1);
      }

      checkpoints.forEach((cp) => {
        console.log(`市场: ${cp.market}`);
        console.log(`类型: ${cp.importType}`);
        console.log(`状态: ${cp.status}`);
        console.log(`进度: ${cp.importedStocks}/${cp.totalStocks}`);
        console.log(`更新时间: ${cp.lastUpdateTime.toLocaleString('zh-CN')}`);
        console.log();
      });
    } else {
      // 列出所有运行中的任务
      const runningTasks = await prisma.updateLog.findMany({
        where: {
          status: 'running',
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 10,
      });

      if (runningTasks.length === 0) {
        console.log(`✅ 当前没有运行中的任务\n`);
      } else {
        console.log(`⚠️ 当前有 ${runningTasks.length} 个运行中的任务:\n`);

        runningTasks.forEach((task, index) => {
          console.log(`${index + 1}. 任务ID: ${task.taskId}`);
          console.log(`   进度: ${task.processedStocks}/${task.totalStocks}`);
          console.log(`   开始时间: ${task.startTime.toLocaleString('zh-CN')}`);
          console.log();
        });
      }

      // 列出最近完成的任务
      const recentTasks = await prisma.updateLog.findMany({
        where: {
          status: {
            in: ['completed', 'failed'],
          },
        },
        orderBy: {
          endTime: 'desc',
        },
        take: 5,
      });

      if (recentTasks.length > 0) {
        console.log(`\n📜 最近完成的任务:\n`);

        recentTasks.forEach((task, index) => {
          const icon = task.status === 'completed' ? '✅' : '❌';
          console.log(`${index + 1}. ${icon} 任务ID: ${task.taskId}`);
          console.log(`   状态: ${task.status}`);
          console.log(`   成功/失败: ${task.successCount}/${task.failedCount}`);
          console.log(
            `   用时: ${Math.round((task.endTime!.getTime() - task.startTime.getTime()) / 60000)} 分钟`,
          );
          console.log();
        });
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ 查询失败: ${error.message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
