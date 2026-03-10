/**
 * 重新计算技术指标
 * 基于现有K线数据重新计算所有技术指标
 */

import { PrismaClient } from '@prisma/client';
import { TechnicalIndicatorsService, PriceData } from '../services/indicators/technical-indicators.service';

const prisma = new PrismaClient();
const indicatorsService = new TechnicalIndicatorsService();

async function main() {
  console.log('📊 重新计算技术指标...\n');

  // 获取所有活跃股票
  const stocks = await prisma.stock.findMany({
    where: {
      admissionStatus: 'active',
    },
  });

  console.log(`找到 ${stocks.length} 只活跃股票\n`);

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log(`[${i + 1}/${stocks.length}] ${stock.stockCode} ${stock.stockName}`);

    try {
      // 1. 获取日线数据
      const dailyKlines = await prisma.kLineData.findMany({
        where: {
          stockCode: stock.stockCode,
          period: 'daily',
        },
        orderBy: { date: 'asc' },
      });

      if (dailyKlines.length === 0) {
        console.log('  ⚠️  没有K线数据，跳过\n');
        continue;
      }

      console.log(`  📈 ${dailyKlines.length} 条日线数据`);

      // 2. 准备价格数据
      const priceData: PriceData[] = dailyKlines.map((k: typeof dailyKlines[number]) => ({
        date: k.date,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
        amount: k.amount || 0,
      }));

      // 3. 删除所有旧指标（日线和周线）
      await prisma.technicalIndicator.deleteMany({
        where: {
          stockCode: stock.stockCode,
        },
      });

      // 4. 计算指标
      const maResults = indicatorsService.calculateMA(priceData, { daily: [50, 150, 200] }, 'daily');
      const kdjResults = indicatorsService.calculateKDJ(priceData, 9, 3);
      const rsiResults = indicatorsService.calculateRSI(priceData, 14);
      const volumeResults = indicatorsService.calculateVolume(priceData, 52);
      const amountResults = indicatorsService.calculateAmount(priceData, 52);

      // 5. 保存指标
      const dailyIndicatorRecords: Array<{
        stockCode: string;
        date: Date;
        period: 'daily';
        indicatorType: string;
        values: string;
      }> = [];

      // MA
      maResults.forEach((item) => {
        if (item.ma50 || item.ma150 || item.ma200) {
          dailyIndicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(item.date),
            period: 'daily',
            indicatorType: 'ma',
            values: JSON.stringify({
              ma50: item.ma50 || null,
              ma150: item.ma150 || null,
              ma200: item.ma200 || null,
            }),
          });
        }
      });

      // KDJ
      kdjResults.forEach((item) => {
        dailyIndicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily',
          indicatorType: 'kdj',
          values: JSON.stringify({
            k: item.k,
            d: item.d,
            j: item.j,
          }),
        });
      });

      // RSI
      rsiResults.forEach((item) => {
        dailyIndicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily',
          indicatorType: 'rsi',
          values: JSON.stringify({ rsi: item.rsi }),
        });
      });

      // Volume
      volumeResults.forEach((item) => {
        dailyIndicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily',
          indicatorType: 'volume',
          values: JSON.stringify({
            volume: item.volume,
            volumeMA: item.volumeMA,
          }),
        });
      });

      // Amount
      amountResults.forEach((item) => {
        dailyIndicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily',
          indicatorType: 'amount',
          values: JSON.stringify({
            amount: item.amount,
            amountMA: item.amountMA,
          }),
        });
      });

      await prisma.technicalIndicator.createMany({
        data: dailyIndicatorRecords,
      });

      console.log(`  ✅ 保存 ${dailyIndicatorRecords.length} 条日线指标`);

      // 6. 周线指标
      const weeklyKlines = await prisma.kLineData.findMany({
        where: {
          stockCode: stock.stockCode,
          period: 'weekly',
        },
        orderBy: { date: 'asc' },
      });

      if (weeklyKlines.length > 0) {
        console.log(`  📈 ${weeklyKlines.length} 条周线数据`);

        const weeklyPriceData: PriceData[] = weeklyKlines.map((k: typeof weeklyKlines[number]) => ({
          date: k.date,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
          amount: k.amount || 0,
        }));

        const weeklyMaResults = indicatorsService.calculateMA(
          weeklyPriceData,
          { weekly: [10, 30, 40] },
          'weekly',
        );

        const weeklyIndicatorRecords: Array<{
          stockCode: string;
          date: Date;
          period: 'weekly';
          indicatorType: string;
          values: string;
        }> = [];

        weeklyMaResults.forEach((item) => {
          if (item.ma10 || item.ma30 || item.ma40) {
            weeklyIndicatorRecords.push({
              stockCode: stock.stockCode,
              date: new Date(item.date),
              period: 'weekly',
              indicatorType: 'ma',
              values: JSON.stringify({
                ma10: item.ma10 || null,
                ma30: item.ma30 || null,
                ma40: item.ma40 || null,
              }),
            });
          }
        });

        await prisma.technicalIndicator.createMany({
          data: weeklyIndicatorRecords,
        });

        console.log(`  ✅ 保存 ${weeklyIndicatorRecords.length} 条周线指标`);
      }

      console.log('');
    } catch (error) {
      console.error(`  ❌ 错误:`, error);
      console.log('');
    }
  }

  console.log('✅ 所有指标重新计算完成！');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
