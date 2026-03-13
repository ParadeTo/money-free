/**
 * 更新指数成分股脚本
 * 手动触发重新获取指数成分股，添加新成员，保留已退出成员的历史数据
 * 
 * 用法:
 *   ts-node src/scripts/update-index-composition.ts --market <HK|US|all>
 */

import { PrismaClient } from '@prisma/client';
import { AkShareAdapter } from '../modules/market-data/data-source/akshare-adapter';
import { YahooFinanceAdapter } from '../modules/market-data/data-source/yahoo-finance-adapter';
import { ImportManager } from '../modules/market-data/import/import-manager';
import { IndexCompositionService } from '../modules/market-data/import/index-composition';

const prisma = new PrismaClient();

interface UpdateOptions {
  market: 'HK' | 'US' | 'all';
}

function parseArguments(): UpdateOptions {
  const args = process.argv.slice(2);
  let market: 'HK' | 'US' | 'all' = 'all';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--market') {
      market = args[++i] as any;
    }
  }

  return { market };
}

async function updateIndexComposition() {
  const options = parseArguments();

  console.log('🔄 更新指数成分股工具\n');
  console.log(`市场: ${options.market}\n`);

  const akshareAdapter = new AkShareAdapter();
  const yahooAdapter = new YahooFinanceAdapter();
  const hkImportManager = new ImportManager({
    primaryAdapter: akshareAdapter,
    backupAdapter: yahooAdapter,
    retryAttempts: 3,
  });
  const usImportManager = new ImportManager({
    primaryAdapter: yahooAdapter,
    backupAdapter: akshareAdapter,
    retryAttempts: 3,
  });

  try {
    if (options.market === 'HK' || options.market === 'all') {
      console.log('🇭🇰 更新港股指数成分股...\n');

      const indexService = new IndexCompositionService(hkImportManager);
      const { constituents, stats } = await indexService.fetchHKConstituents();

      console.log(`✅ 获取到 ${constituents.length} 只港股成分股`);
      console.log('   详情:', stats.byIndex);

      const existingStocks = await prisma.stock.findMany({
        where: { market: 'HK' },
        select: { stockCode: true },
      });

      const existingCodes = new Set(existingStocks.map((s) => s.stockCode));
      const newCodes = new Set(
        constituents.map((c) => indexService.formatStockCode(c.code, 'HK')),
      );

      const addedCodes = [...newCodes].filter((code) => !existingCodes.has(code));
      const removedCodes = [...existingCodes].filter((code) => !newCodes.has(code));

      console.log(`\n新增成员: ${addedCodes.length}`);
      if (addedCodes.length > 0) {
        console.log(`  ${addedCodes.slice(0, 10).join(', ')}${addedCodes.length > 10 ? '...' : ''}`);
      }

      console.log(`退出成员: ${removedCodes.length}`);
      if (removedCodes.length > 0) {
        console.log(`  ${removedCodes.slice(0, 10).join(', ')}${removedCodes.length > 10 ? '...' : ''}`);
        console.log('  (这些股票的历史数据将被保留)');
      }
    }

    if (options.market === 'US' || options.market === 'all') {
      console.log('\n🇺🇸 更新美股指数成分股...\n');

      const indexService = new IndexCompositionService(usImportManager);
      const { constituents, stats } = await indexService.fetchUSConstituents();

      console.log(`✅ 获取到 ${constituents.length} 只美股成分股`);
      console.log('   详情:', stats.byIndex);

      const existingStocks = await prisma.stock.findMany({
        where: { market: 'US' },
        select: { stockCode: true },
      });

      const existingCodes = new Set(existingStocks.map((s) => s.stockCode));
      const newCodes = new Set(
        constituents.map((c) => indexService.formatStockCode(c.code, 'US')),
      );

      const addedCodes = [...newCodes].filter((code) => !existingCodes.has(code));
      const removedCodes = [...existingCodes].filter((code) => !newCodes.has(code));

      console.log(`\n新增成员: ${addedCodes.length}`);
      if (addedCodes.length > 0) {
        console.log(`  ${addedCodes.slice(0, 10).join(', ')}${addedCodes.length > 10 ? '...' : ''}`);
      }

      console.log(`退出成员: ${removedCodes.length}`);
      if (removedCodes.length > 0) {
        console.log(`  ${removedCodes.slice(0, 10).join(', ')}${removedCodes.length > 10 ? '...' : ''}`);
        console.log('  (这些股票的历史数据将被保留)');
      }
    }

    console.log('\n✅ 更新完成！');
    console.log('\n💡 提示: 如需导入新增成员的数据，请运行:');
    console.log('   npm run import-hk (港股)');
    console.log('   npm run import-us (美股)');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 更新过程发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateIndexComposition();
