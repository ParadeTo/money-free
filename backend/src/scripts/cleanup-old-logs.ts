/**
 * 清理旧日志和断点记录
 * 
 * 使用:
 * npx ts-node src/scripts/cleanup-old-logs.ts
 * npx ts-node src/scripts/cleanup-old-logs.ts --days 7
 */

import { PrismaClient } from '@prisma/client';
import { CheckpointManager } from './checkpoint-manager';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let daysToKeep = 7;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      daysToKeep = parseInt(args[i + 1], 10);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧹 清理旧记录`);
  console.log(`📅 保留最近 ${daysToKeep} 天的数据`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // 清理旧的更新日志
    const deletedLogs = await prisma.updateLog.deleteMany({
      where: {
        status: {
          in: ['completed', 'failed'],
        },
        endTime: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`✅ 清理了 ${deletedLogs.count} 条更新日志`);

    // 清理旧的断点记录
    const checkpointManager = new CheckpointManager(prisma);
    const deletedCheckpoints = await checkpointManager.cleanupOldCheckpoints(daysToKeep);

    console.log(`✅ 清理了 ${deletedCheckpoints} 条断点记录`);

    console.log(`\n✅ 清理完成!\n`);
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ 清理失败: ${error.message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
