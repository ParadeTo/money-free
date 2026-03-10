/**
 * 实时监控数据初始化进度（TypeScript版本）
 * 
 * 使用:
 * npx ts-node src/scripts/check-progress.ts
 * 
 * 或持续监控（每30秒刷新）:
 * npx ts-node src/scripts/check-progress.ts --watch
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProgress() {
  console.clear();
  console.log('======================================');
  console.log('📊 数据初始化进度监控');
  console.log('======================================\n');

  // 获取统计数据
  const totalStocks = await prisma.stock.count();
  const processedStocksData = await prisma.kLineData.groupBy({
    by: ['stockCode'],
  });
  const processedStocks = processedStocksData.length;
  
  const totalKlines = await prisma.kLineData.count();
  const dailyKlines = await prisma.kLineData.count({ where: { period: 'daily' } });
  const weeklyKlines = await prisma.kLineData.count({ where: { period: 'weekly' } });
  const totalIndicators = await prisma.technicalIndicator.count();

  // 计算进度
  const remaining = totalStocks - processedStocks;
  const progress = ((processedStocks / totalStocks) * 100).toFixed(1);

  console.log('股票进度:');
  console.log(`  总数: ${totalStocks} 只`);
  console.log(`  已处理: ${processedStocks} 只`);
  console.log(`  待处理: ${remaining} 只`);
  console.log(`  完成度: ${progress}%\n`);

  // 进度条
  const barWidth = 50;
  const filled = Math.floor((processedStocks / totalStocks) * barWidth);
  const empty = barWidth - filled;
  const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
  console.log(`  [${progressBar}] ${progress}%\n`);

  console.log('数据统计:');
  console.log(`  K线数据: ${totalKlines.toLocaleString()} 条`);
  console.log(`    - 日线: ${dailyKlines.toLocaleString()} 条`);
  console.log(`    - 周线: ${weeklyKlines.toLocaleString()} 条`);
  console.log(`  技术指标: ${totalIndicators.toLocaleString()} 条\n`);

  // 预估剩余时间（假设 32只/分钟）
  if (remaining > 0) {
    const remainingMinutes = Math.ceil(remaining / 32);
    const remainingHours = (remainingMinutes / 60).toFixed(1);
    const estimatedCompletion = new Date(Date.now() + remainingMinutes * 60 * 1000);
    
    console.log(`预估剩余时间: ${remainingHours} 小时 (约 ${remainingMinutes} 分钟)`);
    console.log(`预计完成时间: ${estimatedCompletion.toLocaleString()}\n`);
  } else {
    console.log('✅ 所有股票处理完成！\n');
  }

  console.log(`当前时间: ${new Date().toLocaleString()}`);
  console.log('======================================\n');

  return remaining === 0;
}

async function main() {
  const watchMode = process.argv.includes('--watch');

  if (watchMode) {
    console.log('⏱️  监控模式启动（每30秒刷新，按 Ctrl+C 退出）\n');
    
    while (true) {
      const completed = await checkProgress();
      
      if (completed) {
        console.log('🎉 数据初始化完成！');
        break;
      }
      
      // 等待30秒后刷新
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  } else {
    await checkProgress();
  }
}

main()
  .catch((error) => {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
