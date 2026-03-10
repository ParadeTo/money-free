/**
 * 获取样本 K线数据脚本
 * 
 * 功能:
 * 1. 从数据库获取测试股票列表 (5只)
 * 2. 使用 DataSourceManager 获取最近 1 年的日线数据
 * 3. 将数据保存到 KLineData 表
 * 4. 计算技术指标并保存到 TechnicalIndicator 表
 * 
 * 使用:
 * npx ts-node src/scripts/fetch-sample-klines.ts
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TushareService } from '../services/datasource/tushare.service';
import { AkShareService } from '../services/datasource/akshare.service';
import { DataSourceManagerService } from '../services/datasource/datasource-manager.service';
import { TechnicalIndicatorsService, PriceData } from '../services/indicators/technical-indicators.service';
import { PythonBridgeService } from '../services/python-bridge/python-bridge.service';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Starting sample K-line data fetch...\n');

  // 初始化服务
  const configService = new ConfigService();
  const pythonBridge = new PythonBridgeService();
  const tushareService = new TushareService(configService);
  const akshareService = new AkShareService(pythonBridge);
  const dataSourceManager = new DataSourceManagerService(tushareService, akshareService);
  const indicatorsService = new TechnicalIndicatorsService();

  // 获取测试股票
  const stocks = await prisma.stock.findMany({
    take: 5,
  });

  if (stocks.length === 0) {
    console.log('⚠️ No stocks found in database. Run add-test-stocks.ts first.');
    return;
  }

  console.log(`Found ${stocks.length} stocks:\n`);
  stocks.forEach((stock: typeof stocks[number]) => {
    console.log(`  - ${stock.stockCode} ${stock.stockName}`);
  });
  console.log('');

  // 使用确定的历史日期范围 (2022-2024年数据，共约2年)
  // 至少需要2年数据以确保能计算MA200（需要至少200个交易日）
  // 避免使用太新的数据，AkShare 可能还没更新
  const endDate = new Date('2024-02-28');
  const startDate = new Date('2022-01-01');

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Date range: ${startDateStr} to ${endDateStr}\n`);

  // 为每只股票获取数据
  for (const stock of stocks) {
    console.log(`\n--- Processing ${stock.stockCode} ${stock.stockName} ---`);

    try {
      // ===== 1. 获取和保存日线数据 =====
      console.log(`📈 Fetching daily K-line data...`);
      const { data: dailyData, source: dailySource } = await dataSourceManager.getDailyKLine({
        stockCode: stock.stockCode,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      console.log(`✅ Fetched ${dailyData.length} daily records from ${dailySource}`);

      if (dailyData.length === 0) {
        console.log('⚠️ No data available, skipping...');
        continue;
      }

      // 2. 保存到数据库 (删除旧数据)
      console.log(`💾 Saving to database...`);
      
      await prisma.kLineData.deleteMany({
        where: {
          stockCode: stock.stockCode,
          period: 'daily',
        },
      });

      await prisma.kLineData.createMany({
        data: dailyData.map((item) => ({
          stockCode: stock.stockCode,
          date: item.date,
          period: 'daily',
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          amount: item.amount,
          source: 'tushare',
        })),
      });

      console.log(`✅ Saved ${dailyData.length} records to KLineData table`);

      // 3. 计算技术指标
      console.log(`📊 Calculating technical indicators...`);

      // 确保数据按日期升序排列（从旧到新）
      const sortedDailyData = [...dailyData].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const priceData: PriceData[] = sortedDailyData.map((item) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        amount: item.amount,
      }));

      // MA
      const maResults = indicatorsService.calculateMA(priceData, { daily: [50, 150, 200] }, 'daily');
      
      // KDJ
      const kdjResults = indicatorsService.calculateKDJ(priceData, 9, 3);
      
      // RSI
      const rsiResults = indicatorsService.calculateRSI(priceData, 14);

      // Volume
      const volumeResults = indicatorsService.calculateVolume(priceData, 52);

      // Amount
      const amountResults = indicatorsService.calculateAmount(priceData, 52);

      // 52周标注
      const markers = indicatorsService.calculate52WeekMarkers(priceData);

      // 4. 保存技术指标 (删除旧数据)
      await prisma.technicalIndicator.deleteMany({
        where: {
          stockCode: stock.stockCode,
          period: 'daily',
        },
      });

      const indicatorRecords = [];

      // MA 指标
      maResults.forEach((item, index) => {
        if (item.ma50 || item.ma150 || item.ma200) {
          indicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(item.date),
            period: 'daily' as const,
            indicatorType: 'ma',
            values: JSON.stringify({
              ma50: item.ma50 || null,
              ma150: item.ma150 || null,
              ma200: item.ma200 || null,
            }),
          });
        }
      });

      // KDJ 指标
      kdjResults.forEach((item) => {
        indicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily' as const,
          indicatorType: 'kdj',
          values: JSON.stringify({
            k: item.k,
            d: item.d,
            j: item.j,
          }),
        });
      });

      // RSI 指标
      rsiResults.forEach((item) => {
        indicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily' as const,
          indicatorType: 'rsi',
          values: JSON.stringify({ rsi: item.rsi }),
        });
      });

      // Volume 指标
      volumeResults.forEach((item) => {
        indicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily' as const,
          indicatorType: 'volume',
          values: JSON.stringify({
            volume: item.volume,
            volumeMA: item.volumeMA,
          }),
        });
      });

      // Amount 指标
      amountResults.forEach((item) => {
        indicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily' as const,
          indicatorType: 'amount',
          values: JSON.stringify({
            amount: item.amount,
            amountMA: item.amountMA,
          }),
        });
      });

      // 52周标注
      if (markers) {
        indicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(),
          period: 'daily' as const,
          indicatorType: 'week52_marker',
          values: JSON.stringify(markers),
        });
      }

      if (indicatorRecords.length > 0) {
        await prisma.technicalIndicator.createMany({
          data: indicatorRecords,
        });
        console.log(`✅ Saved ${indicatorRecords.length} indicator records`);
      }

      // ===== 2. 获取和保存周线数据 =====
      console.log(`\n📊 Fetching weekly K-line data...`);
      const { data: weeklyData, source: weeklySource } = await dataSourceManager.getWeeklyKLine({
        stockCode: stock.stockCode,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      console.log(`✅ Fetched ${weeklyData.length} weekly records from ${weeklySource}`);

      if (weeklyData.length > 0) {
        // 保存周线数据
        console.log(`💾 Saving weekly data to database...`);
        
        await prisma.kLineData.deleteMany({
          where: {
            stockCode: stock.stockCode,
            period: 'weekly',
          },
        });

        await prisma.kLineData.createMany({
          data: weeklyData.map((item) => ({
            stockCode: stock.stockCode,
            date: item.date,
            period: 'weekly',
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            amount: item.amount,
            source: weeklySource,
          })),
        });

        console.log(`✅ Saved ${weeklyData.length} weekly records`);

        // 计算周线技术指标
        console.log(`📊 Calculating weekly indicators...`);

        const sortedWeeklyData = [...weeklyData].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const weeklyPriceData: PriceData[] = sortedWeeklyData.map((item) => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          amount: item.amount,
        }));

        // 周线 MA (10/30/40)
        const weeklyMaResults = indicatorsService.calculateMA(weeklyPriceData, { weekly: [10, 30, 40] }, 'weekly');
        
        // 周线 KDJ
        const weeklyKdjResults = indicatorsService.calculateKDJ(weeklyPriceData, 9, 3);
        
        // 周线 RSI
        const weeklyRsiResults = indicatorsService.calculateRSI(weeklyPriceData, 14);

        // 周线 Volume
        const weeklyVolumeResults = indicatorsService.calculateVolume(weeklyPriceData, 52);

        // 周线 Amount
        const weeklyAmountResults = indicatorsService.calculateAmount(weeklyPriceData, 52);

        // 周线 52周标注
        const weeklyMarkers = indicatorsService.calculate52WeekMarkers(weeklyPriceData);

        // 删除旧的周线指标
        await prisma.technicalIndicator.deleteMany({
          where: {
            stockCode: stock.stockCode,
            period: 'weekly',
          },
        });

        const weeklyIndicatorRecords = [];

        // 周线 MA 指标
        weeklyMaResults.forEach((item) => {
          if (item.ma10 || item.ma30 || item.ma40) {
            weeklyIndicatorRecords.push({
              stockCode: stock.stockCode,
              date: new Date(item.date),
              period: 'weekly' as const,
              indicatorType: 'ma',
              values: JSON.stringify({
                ma10: item.ma10 || null,
                ma30: item.ma30 || null,
                ma40: item.ma40 || null,
              }),
            });
          }
        });

        // 周线 KDJ 指标
        weeklyKdjResults.forEach((item) => {
          weeklyIndicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(item.date),
            period: 'weekly' as const,
            indicatorType: 'kdj',
            values: JSON.stringify({
              k: item.k,
              d: item.d,
              j: item.j,
            }),
          });
        });

        // 周线 RSI 指标
        weeklyRsiResults.forEach((item) => {
          weeklyIndicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(item.date),
            period: 'weekly' as const,
            indicatorType: 'rsi',
            values: JSON.stringify({ rsi: item.rsi }),
          });
        });

        // 周线 Volume 指标
        weeklyVolumeResults.forEach((item) => {
          weeklyIndicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(item.date),
            period: 'weekly' as const,
            indicatorType: 'volume',
            values: JSON.stringify({
              volume: item.volume,
              volumeMA: item.volumeMA,
            }),
          });
        });

        // 周线 Amount 指标
        weeklyAmountResults.forEach((item) => {
          weeklyIndicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(item.date),
            period: 'weekly' as const,
            indicatorType: 'amount',
            values: JSON.stringify({
              amount: item.amount,
              amountMA: item.amountMA,
            }),
          });
        });

        // 周线 52周标注
        if (weeklyMarkers) {
          weeklyIndicatorRecords.push({
            stockCode: stock.stockCode,
            date: new Date(),
            period: 'weekly' as const,
            indicatorType: 'week52_marker',
            values: JSON.stringify(weeklyMarkers),
          });
        }

        if (weeklyIndicatorRecords.length > 0) {
          await prisma.technicalIndicator.createMany({
            data: weeklyIndicatorRecords,
          });
          console.log(`✅ Saved ${weeklyIndicatorRecords.length} weekly indicator records`);
        }
      }

      console.log(`\n✨ Successfully processed ${stock.stockCode} (daily + weekly)`);
    } catch (error) {
      console.error(`❌ Error processing ${stock.stockCode}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n\n🎉 Sample K-line data fetch completed!');
}

main()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
