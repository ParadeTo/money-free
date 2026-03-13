/**
 * 美股导入功能测试脚本
 * 只导入前3只股票，快速验证功能
 */

import { PrismaClient } from '@prisma/client';
import { YahooFinanceAdapter } from '../modules/market-data/data-source/yahoo-finance-adapter';
import { AkShareAdapter } from '../modules/market-data/data-source/akshare-adapter';
import { ImportManager } from '../modules/market-data/import/import-manager';
import { MarketType } from '../types/market-data';

const prisma = new PrismaClient();

async function testImport() {
  console.log('🧪 美股导入功能测试\n');

  const yahooAdapter = new YahooFinanceAdapter();
  const akshareAdapter = new AkShareAdapter();
  const importManager = new ImportManager({
    primaryAdapter: yahooAdapter,
    backupAdapter: akshareAdapter,
    retryAttempts: 2,
  });

  const testStocks = [
    { code: 'AAPL', name: 'Apple Inc.' },
    { code: 'MSFT', name: 'Microsoft Corporation' },
    { code: 'GOOGL', name: 'Alphabet Inc.' },
  ];

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  let successCount = 0;
  let failCount = 0;

  for (const stock of testStocks) {
    try {
      console.log(`\n测试 ${stock.code} (${stock.name})...`);

      console.log('  1. 获取基本信息...');
      const stockInfo = await importManager.fetchStockInfoWithFallback(
        stock.code,
        MarketType.US,
      );

      if (!stockInfo.data) {
        console.error(`    ✗ 失败:`, stockInfo.errors);
        failCount++;
        continue;
      }

      console.log(`    ✓ ${stockInfo.data.name} (来源: ${stockInfo.source})`);

      console.log('  2. 获取K线数据...');
      const klines = await importManager.fetchKlineDataWithFallback(
        stock.code,
        MarketType.US,
        startDate,
        endDate,
      );

      if (!klines.data || klines.data.length === 0) {
        console.error(`    ✗ 失败:`, klines.errors);
        failCount++;
        continue;
      }

      console.log(`    ✓ ${klines.data.length} 条记录 (来源: ${klines.source})`);
      console.log(`    最早: ${klines.data[0].date}, 最新: ${klines.data[klines.data.length - 1].date}`);

      successCount++;
    } catch (error) {
      console.error(`  ✗ 错误:`, error);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 成功: ${successCount}/${testStocks.length}`);
  console.log(`❌ 失败: ${failCount}/${testStocks.length}`);
  console.log('='.repeat(50));

  await prisma.$disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

testImport();
