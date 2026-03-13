/**
 * 系统状态报告
 * 生成当前数据导入和VCP分析状态的完整报告
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateReport() {
  console.log('📊 Money-Free 系统状态报告');
  console.log('═'.repeat(70));
  console.log(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  console.log('📈 股票数据统计\n');

  const stocksByMarket = await prisma.stock.groupBy({
    by: ['market', 'currency'],
    _count: { stockCode: true },
    where: { admissionStatus: 'active' },
  });

  let totalStocks = 0;
  stocksByMarket.forEach((group) => {
    const marketName = {
      SH: 'A股(沪)',
      SZ: 'A股(深)',
      HK: '港股',
      US: '美股',
    }[group.market] || group.market;

    console.log(`  ${marketName.padEnd(12)} ${group._count.stockCode.toString().padStart(4)} 只  (${group.currency})`);
    totalStocks += group._count.stockCode;
  });

  console.log(`  ${'─'.repeat(25)}`);
  console.log(`  ${'总计'.padEnd(12)} ${totalStocks.toString().padStart(4)} 只\n`);

  const klinesByMarket = await prisma.$queryRaw<Array<{ market: string; kline_count: bigint }>>`
    SELECT s.market, COUNT(k.id) as kline_count
    FROM kline_data k
    JOIN stocks s ON k.stock_code = s.stock_code
    GROUP BY s.market
  `;

  console.log('📊 K线数据统计\n');

  let totalKlines = 0n;
  for (const group of klinesByMarket) {
    const marketName = {
      SH: 'A股(沪)',
      SZ: 'A股(深)',
      HK: '港股',
      US: '美股',
    }[group.market] || group.market;

    const count = group.kline_count;
    console.log(`  ${marketName.padEnd(12)} ${count.toString().padStart(10)} 条`);
    totalKlines += count;
  }

  console.log(`  ${'─'.repeat(30)}`);
  console.log(`  ${'总计'.padEnd(12)} ${totalKlines.toString().padStart(10)} 条\n`);

  const latestVcpScan = await prisma.vcpScanResult.findFirst({
    orderBy: { scanDate: 'desc' },
    select: { scanDate: true },
  });

  if (latestVcpScan) {
    const vcpCount = await prisma.vcpScanResult.count({
      where: {
        scanDate: latestVcpScan.scanDate,
        trendTemplatePass: true,
        contractionCount: { gte: 3 },
      },
    });

    const vcpByMarket = await prisma.$queryRaw<Array<{ market: string; vcp_count: bigint }>>`
      SELECT s.market, COUNT(v.id) as vcp_count
      FROM vcp_scan_results v
      JOIN stocks s ON v.stock_code = s.stock_code
      WHERE v.scan_date = ${latestVcpScan.scanDate}
        AND v.trend_template_pass = 1
        AND v.contraction_count >= 3
      GROUP BY s.market
    `;

    console.log('🎯 VCP分析结果\n');
    console.log(`  扫描日期: ${latestVcpScan.scanDate.toISOString().split('T')[0]}`);
    console.log(`  通过VCP: ${vcpCount} 只\n`);

    if (vcpByMarket.length > 0) {
      console.log('  按市场分布:');
      for (const group of vcpByMarket) {
        const marketName = {
          SH: 'A股(沪)',
          SZ: 'A股(深)',
          HK: '港股',
          US: '美股',
        }[group.market] || group.market;
        console.log(`    ${marketName.padEnd(12)} ${group.vcp_count.toString().padStart(3)} 只`);
      }
    } else {
      console.log('  （暂无通过VCP的股票）');
    }
  } else {
    console.log('⚠️  尚未运行VCP分析\n');
    console.log('  运行命令: npm run calculate-vcp');
  }

  const activeCheckpoints = await prisma.importCheckpoint.findMany({
    where: { status: { in: ['running', 'paused'] } },
    orderBy: { startTime: 'desc' },
  });

  if (activeCheckpoints.length > 0) {
    console.log('\n🔄 活跃的导入任务\n');
    activeCheckpoints.forEach((cp) => {
      const progress = ((cp.importedStocks / cp.totalStocks) * 100).toFixed(1);
      console.log(`  ${cp.taskId}`);
      console.log(`    市场: ${cp.market} | 类型: ${cp.importType}`);
      console.log(`    进度: ${cp.importedStocks}/${cp.totalStocks} (${progress}%)`);
      console.log(`    状态: ${cp.status}`);
      console.log();
    });
  }

  console.log('═'.repeat(70));
  console.log('✅ 报告生成完成\n');

  await prisma.$disconnect();
}

generateReport();
