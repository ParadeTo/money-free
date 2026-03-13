/**
 * 验证导入数据脚本
 * 检查港股和美股数据是否正确导入
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('🔍 验证导入数据\n');

  const hkStocks = await prisma.stock.findMany({
    where: { market: 'HK' },
    select: { stockCode: true, stockName: true, currency: true },
  });

  const usStocks = await prisma.stock.findMany({
    where: { market: 'US' },
    select: { stockCode: true, stockName: true, currency: true },
  });

  console.log(`🇭🇰 港股数量: ${hkStocks.length}`);
  hkStocks.forEach((s) => {
    console.log(`  - ${s.stockCode} ${s.stockName} (${s.currency})`);
  });

  console.log(`\n🇺🇸 美股数量: ${usStocks.length}`);
  usStocks.forEach((s) => {
    console.log(`  - ${s.stockCode} ${s.stockName} (${s.currency})`);
  });

  if (hkStocks.length > 0) {
    const sampleHK = hkStocks[0];
    const hkKlines = await prisma.kLineData.count({
      where: { stockCode: sampleHK.stockCode, period: 'daily' },
    });
    console.log(`\n📊 ${sampleHK.stockCode} K线数据: ${hkKlines} 条`);
  }

  if (usStocks.length > 0) {
    const sampleUS = usStocks[0];
    const usKlines = await prisma.kLineData.count({
      where: { stockCode: sampleUS.stockCode, period: 'daily' },
    });
    console.log(`📊 ${sampleUS.stockCode} K线数据: ${usKlines} 条`);
  }

  console.log('\n✅ 验证完成！');
  await prisma.$disconnect();
}

verifyImport();
