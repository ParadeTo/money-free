/**
 * 快速导入示例数据
 * 导入5只港股和5只美股的1年历史数据，用于快速验证功能
 */

import { PrismaClient } from '@prisma/client';
import { YahooFinanceAdapter } from '../modules/market-data/data-source/yahoo-finance-adapter';
import { AkShareAdapter } from '../modules/market-data/data-source/akshare-adapter';
import { ImportManager } from '../modules/market-data/import/import-manager';
import { MarketType } from '../types/market-data';

const prisma = new PrismaClient();

const HK_SAMPLES = [
  { code: '00700', name: '腾讯控股' },
  { code: '00941', name: '中国移动' },
  { code: '00939', name: '建设银行' },
  { code: '00005', name: '汇丰控股' },
  { code: '00001', name: '长和' },
];

const US_SAMPLES = [
  { code: 'AAPL', name: 'Apple Inc.' },
  { code: 'MSFT', name: 'Microsoft' },
  { code: 'GOOGL', name: 'Alphabet' },
  { code: 'NVDA', name: 'NVIDIA' },
  { code: 'TSLA', name: 'Tesla' },
];

async function quickImport() {
  console.log('🚀 快速导入示例数据\n');
  console.log('将导入:');
  console.log(`  🇭🇰 港股: ${HK_SAMPLES.length} 只`);
  console.log(`  🇺🇸 美股: ${US_SAMPLES.length} 只`);
  console.log(`  📅 时间范围: 1年\n`);

  const yahooAdapter = new YahooFinanceAdapter();
  const akshareAdapter = new AkShareAdapter();
  const importManager = new ImportManager({
    primaryAdapter: yahooAdapter,
    backupAdapter: akshareAdapter,
    retryAttempts: 2,
  });

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  let totalSuccess = 0;
  let totalFailed = 0;

  console.log('═'.repeat(60));
  console.log('📊 导入港股数据\n');

  for (const stock of HK_SAMPLES) {
    try {
      const stockCode = `${stock.code}.HK`;
      console.log(`[HK] ${stockCode} (${stock.name})...`);

      const stockInfo = await importManager.fetchStockInfoWithFallback(
        stock.code,
        MarketType.HK,
      );

      if (!stockInfo.data) {
        console.error(`  ✗ 获取信息失败`);
        totalFailed++;
        continue;
      }

      const klines = await importManager.fetchKlineDataWithFallback(
        stock.code,
        MarketType.HK,
        startDate,
        endDate,
      );

      if (!klines.data || klines.data.length === 0) {
        console.error(`  ✗ 获取K线失败`);
        totalFailed++;
        continue;
      }

      await prisma.stock.upsert({
        where: { stockCode },
        update: {
          stockName: stockInfo.data.name,
          market: 'HK',
          currency: 'HKD',
          industry: stockInfo.data.industry,
          updatedAt: new Date(),
        },
        create: {
          stockCode,
          stockName: stockInfo.data.name,
          market: 'HK',
          currency: 'HKD',
          industry: stockInfo.data.industry,
          listDate: new Date(stockInfo.data.listDate),
          marketCap: stockInfo.data.marketCap,
          admissionStatus: 'active',
        },
      });

      for (const k of klines.data) {
        await prisma.kLineData.upsert({
          where: {
            stockCode_date_period: {
              stockCode,
              date: new Date(k.date),
              period: 'daily',
            },
          },
          update: {
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            amount: k.amount,
            source: klines.source || 'yahoo_finance',
          },
          create: {
            stockCode,
            date: new Date(k.date),
            period: 'daily',
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            amount: k.amount,
            source: klines.source || 'yahoo_finance',
          },
        });
      }

      console.log(`  ✓ 成功 (${klines.data.length} K线)`);
      totalSuccess++;
    } catch (error) {
      console.error(`  ✗ 错误:`, error instanceof Error ? error.message : error);
      totalFailed++;
    }
  }

  console.log('\n═'.repeat(60));
  console.log('📊 导入美股数据\n');

  for (const stock of US_SAMPLES) {
    try {
      const stockCode = `${stock.code}.US`;
      console.log(`[US] ${stockCode} (${stock.name})...`);

      const stockInfo = await importManager.fetchStockInfoWithFallback(
        stock.code,
        MarketType.US,
      );

      if (!stockInfo.data) {
        console.error(`  ✗ 获取信息失败`);
        totalFailed++;
        continue;
      }

      const klines = await importManager.fetchKlineDataWithFallback(
        stock.code,
        MarketType.US,
        startDate,
        endDate,
      );

      if (!klines.data || klines.data.length === 0) {
        console.error(`  ✗ 获取K线失败`);
        totalFailed++;
        continue;
      }

      await prisma.stock.upsert({
        where: { stockCode },
        update: {
          stockName: stockInfo.data.name,
          market: 'US',
          currency: 'USD',
          industry: stockInfo.data.industry,
          updatedAt: new Date(),
        },
        create: {
          stockCode,
          stockName: stockInfo.data.name,
          market: 'US',
          currency: 'USD',
          industry: stockInfo.data.industry,
          listDate: new Date(stockInfo.data.listDate),
          marketCap: stockInfo.data.marketCap,
          admissionStatus: 'active',
        },
      });

      for (const k of klines.data) {
        await prisma.kLineData.upsert({
          where: {
            stockCode_date_period: {
              stockCode,
              date: new Date(k.date),
              period: 'daily',
            },
          },
          update: {
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            amount: k.amount,
            source: klines.source || 'yahoo_finance',
          },
          create: {
            stockCode,
            date: new Date(k.date),
            period: 'daily',
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            amount: k.amount,
            source: klines.source || 'yahoo_finance',
          },
        });
      }

      console.log(`  ✓ 成功 (${klines.data.length} K线)`);
      totalSuccess++;
    } catch (error) {
      console.error(`  ✗ 错误:`, error instanceof Error ? error.message : error);
      totalFailed++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📈 导入完成统计\n');
  console.log(`✅ 成功: ${totalSuccess}/${HK_SAMPLES.length + US_SAMPLES.length}`);
  console.log(`❌ 失败: ${totalFailed}/${HK_SAMPLES.length + US_SAMPLES.length}`);
  console.log('═'.repeat(60));

  console.log('\n💡 下一步:');
  console.log('  1. 运行VCP分析: npm run calculate-vcp');
  console.log('  2. 启动前端验证显示: cd ../frontend && npm run dev');
  console.log('  3. 完整导入: npm run import-hk && npm run import-us');

  await prisma.$disconnect();
  process.exit(totalFailed > 0 ? 1 : 0);
}

quickImport();
