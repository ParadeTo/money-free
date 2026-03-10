/**
 * 重新获取前复权K线数据
 * 
 * 功能:
 * 1. 清空现有的 K线数据和技术指标
 * 2. 从 Tushare/AkShare 重新获取前复权数据
 * 3. 重新计算技术指标
 * 
 * 使用:
 * npx ts-node src/scripts/refetch-klines.ts
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
  console.log('📊 重新获取前复权K线数据...\n');

  // 初始化服务
  const configService = new ConfigService();
  const pythonBridge = new PythonBridgeService();
  const tushareService = new TushareService(configService);
  const akshareService = new AkShareService(pythonBridge);
  const dataSourceManager = new DataSourceManagerService(tushareService, akshareService);
  const indicatorsService = new TechnicalIndicatorsService();

  // 获取所有活跃股票
  const stocks = await prisma.stock.findMany({
    where: {
      admissionStatus: 'active',
    },
  });

  if (stocks.length === 0) {
    console.log('⚠️ 没有找到活跃股票');
    return;
  }

  console.log(`找到 ${stocks.length} 只活跃股票:\n`);
  stocks.forEach((stock: typeof stocks[number]) => {
    console.log(`  - ${stock.stockCode} ${stock.stockName}`);
  });
  console.log('');

  // 确认操作
  console.log('⚠️  即将清空现有数据并重新获取前复权数据');
  console.log('📅 数据范围: 2022-01-01 到 2024-02-28 (约2年)');
  console.log('');

  // 日期范围
  const startDate = new Date('2022-01-01');
  const endDate = new Date('2024-02-28');
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // 统计
  let successCount = 0;
  let errorCount = 0;

  // 为每只股票重新获取数据
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log(`\n[${i + 1}/${stocks.length}] ${stock.stockCode} ${stock.stockName}`);
    console.log('─'.repeat(60));

    try {
      // 1. 删除旧数据
      console.log('🗑️  删除旧数据...');
      
      await prisma.technicalIndicator.deleteMany({
        where: { stockCode: stock.stockCode },
      });
      
      await prisma.kLineData.deleteMany({
        where: { stockCode: stock.stockCode },
      });
      
      console.log('✅ 旧数据已清除');

      // 2. 获取日线数据（前复权）
      console.log('📈 获取日线数据（前复权）...');
      const { data: dailyData, source: dailySource } = await dataSourceManager.getDailyKLine({
        stockCode: stock.stockCode,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      console.log(`✅ 从 ${dailySource} 获取 ${dailyData.length} 条日线数据`);

      if (dailyData.length === 0) {
        console.log('⚠️  没有可用数据，跳过');
        errorCount++;
        continue;
      }

      // 3. 保存日线数据
      console.log('💾 保存日线数据...');
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
        })),
      });
      console.log(`✅ ${dailyData.length} 条日线数据已保存`);

      // 4. 计算并保存日线技术指标
      console.log('📊 计算日线技术指标...');
      
      const priceData: PriceData[] = dailyData.map((item) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        amount: item.amount,
      }));

      // MA 指标
      const maResults = indicatorsService.calculateMA(priceData, { daily: [50, 150, 200] }, 'daily');

      // KDJ 指标
      const kdjResults = indicatorsService.calculateKDJ(priceData, 9, 3);

      // RSI 指标
      const rsiResults = indicatorsService.calculateRSI(priceData, 14);

      // 保存指标
      const dailyIndicatorRecords: Array<{
        stockCode: string;
        date: Date;
        period: 'daily';
        indicatorType: string;
        values: string;
      }> = [];

      // MA 指标记录
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

      // KDJ 指标记录
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

      // RSI 指标记录
      rsiResults.forEach((item) => {
        dailyIndicatorRecords.push({
          stockCode: stock.stockCode,
          date: new Date(item.date),
          period: 'daily',
          indicatorType: 'rsi',
          values: JSON.stringify({ rsi: item.rsi }),
        });
      });

      await prisma.technicalIndicator.createMany({
        data: dailyIndicatorRecords,
      });

      console.log(`✅ ${dailyIndicatorRecords.length} 条日线指标已保存`);

      // 5. 获取周线数据（前复权）
      console.log('📈 获取周线数据（前复权）...');
      const { data: weeklyData, source: weeklySource } = await dataSourceManager.getWeeklyKLine({
        stockCode: stock.stockCode,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      console.log(`✅ 从 ${weeklySource} 获取 ${weeklyData.length} 条周线数据`);

      if (weeklyData.length > 0) {
        // 6. 保存周线数据
        console.log('💾 保存周线数据...');
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
          })),
        });
        console.log(`✅ ${weeklyData.length} 条周线数据已保存`);

        // 7. 计算并保存周线技术指标
        console.log('📊 计算周线技术指标...');
        
        const weeklyPriceData: PriceData[] = weeklyData.map((item) => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          amount: item.amount,
        }));

        const weeklyMaResults = indicatorsService.calculateMA(weeklyPriceData, { weekly: [10, 30, 40] }, 'weekly');

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

        console.log(`✅ ${weeklyIndicatorRecords.length} 条周线指标已保存`);
      }

      console.log(`\n✅ ${stock.stockCode} 处理完成`);
      successCount++;

      // 每只股票后延迟 500ms，避免 API 限流
      if (i < stocks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`\n❌ ${stock.stockCode} 处理失败:`, error);
      errorCount++;
    }
  }

  // 最终统计
  console.log('\n' + '='.repeat(60));
  console.log('📈 数据获取完成！');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount} 只`);
  console.log(`❌ 失败: ${errorCount} 只`);
  console.log(`📊 总计: ${stocks.length} 只`);
  console.log('');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
