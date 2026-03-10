/**
 * 生成模拟 K线数据
 * 
 * 用于演示和测试，当真实数据源不可用时使用
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 生成随机价格波动
 */
function generateRandomPrice(basePrice: number, volatility: number): number {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return basePrice * (1 + change);
}

/**
 * 为单只股票生成模拟K线数据
 */
async function generateMockKLinesForStock(
  stockCode: string,
  basePrice: number,
  days: number
) {
  console.log(`\n--- Generating mock data for ${stockCode} ---`);

  const startDate = new Date('2023-03-01');
  const klineData: any[] = [];
  
  let currentPrice = basePrice;
  let previousClose = basePrice;
  const volatility = 0.02; // 2% 波动率

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const open = currentPrice;
    const high = generateRandomPrice(open, volatility * 1.5);
    const low = generateRandomPrice(open, volatility * 1.5);
    const close = generateRandomPrice(open, volatility);
    
    // 确保 high >= max(open, close) 且 low <= min(open, close)
    const maxPrice = Math.max(open, close, high);
    const minPrice = Math.min(open, close, low);
    
    const volume = Math.floor(Math.random() * 10000000) + 5000000;
    const amount = volume * ((high + low) / 2);

    const change = close - previousClose;
    const pctChange = (change / previousClose) * 100;

    klineData.push({
      stockCode,
      date,
      period: 'daily' as const,
      open,
      high: maxPrice,
      low: minPrice,
      close,
      volume,
      amount,
    });

    previousClose = close;
    currentPrice = close;
  }

  console.log(`Generated ${klineData.length} daily K-line records`);

  // 删除旧数据
  await prisma.kLineData.deleteMany({
    where: { stockCode, period: 'daily' },
  });

  // 插入新数据
  await prisma.kLineData.createMany({
    data: klineData,
  });

  console.log(`✅ Saved ${klineData.length} records to database`);

  // 计算并保存技术指标
  await generateIndicators(stockCode, klineData);

  return klineData;
}

/**
 * 计算并保存技术指标
 */
async function generateIndicators(stockCode: string, klineData: any[]) {
  console.log(`📊 Calculating technical indicators...`);

  // 删除旧指标
  await prisma.technicalIndicator.deleteMany({
    where: { stockCode, period: 'daily' },
  });

  const indicators = [];

  // 计算 MA (50, 150, 200)
  for (let i = 0; i < klineData.length; i++) {
    const ma50 = i >= 49 ? calculateMA(klineData, i, 50) : null;
    const ma150 = i >= 149 ? calculateMA(klineData, i, 150) : null;
    const ma200 = i >= 199 ? calculateMA(klineData, i, 200) : null;

    if (ma50 || ma150 || ma200) {
      indicators.push({
        stockCode,
        date: klineData[i].date,
        period: 'daily' as const,
        indicatorType: 'ma',
        values: JSON.stringify({
          ma50,
          ma150,
          ma200,
        }),
      });
    }
  }

  // 计算 RSI (14)
  for (let i = 14; i < klineData.length; i++) {
    const rsi = calculateRSI(klineData, i, 14);
    indicators.push({
      stockCode,
      date: klineData[i].date,
      period: 'daily' as const,
      indicatorType: 'rsi',
      values: JSON.stringify({ rsi }),
    });
  }

  // 计算成交量均线 (52周 = 260天)
  for (let i = 0; i < klineData.length; i++) {
    const volumeMA = i >= 259 ? calculateVolumeMA(klineData, i, 260) : 0;
    indicators.push({
      stockCode,
      date: klineData[i].date,
      period: 'daily' as const,
      indicatorType: 'volume',
      values: JSON.stringify({
        volume: klineData[i].volume,
        volumeMA,
      }),
    });
  }

  // 计算52周高低点
  const recentData = klineData.slice(-260); // 最近260个交易日
  const high52Week = Math.max(...recentData.map((d) => d.high));
  const low52Week = Math.min(...recentData.map((d) => d.low));
  
  indicators.push({
    stockCode,
    date: new Date(),
    period: 'daily' as const,
    indicatorType: 'week52_marker',
    values: JSON.stringify({
      high52Week,
      low52Week,
      high52WeekDate: recentData.find((d) => d.high === high52Week)?.date,
      low52WeekDate: recentData.find((d) => d.low === low52Week)?.date,
    }),
  });

  await prisma.technicalIndicator.createMany({
    data: indicators,
  });

  console.log(`✅ Saved ${indicators.length} indicator records`);
}

function calculateMA(data: any[], index: number, period: number): number {
  const sum = data
    .slice(Math.max(0, index - period + 1), index + 1)
    .reduce((acc, d) => acc + d.close, 0);
  return sum / Math.min(period, index + 1);
}

function calculateRSI(data: any[], index: number, period: number): number {
  let gains = 0;
  let losses = 0;

  for (let i = Math.max(1, index - period + 1); i <= index; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateVolumeMA(data: any[], index: number, period: number): number {
  const sum = data
    .slice(Math.max(0, index - period + 1), index + 1)
    .reduce((acc, d) => acc + d.volume, 0);
  return sum / Math.min(period, index + 1);
}

async function main() {
  console.log('📊 Generating mock K-line data...\n');

  // 获取股票列表
  const stocks = await prisma.stock.findMany({
    take: 5,
  });

  if (stocks.length === 0) {
    console.log('⚠️ No stocks found. Please run add-test-stocks.ts first.');
    return;
  }

  console.log(`Found ${stocks.length} stocks to generate data for:\n`);
  stocks.forEach((s: typeof stocks[number]) => console.log(`  - ${s.stockCode} ${s.stockName}`));

  // 为每只股票生成数据 (250个交易日 ≈ 1年)
  const stockBasePrices: { [key: string]: number } = {
    '600519': 1800, // 贵州茅台
    '000858': 200,  // 五粮液
    '600036': 45,   // 招商银行
    '000001': 12,   // 平安银行
    '601318': 50,   // 中国平安
  };

  for (const stock of stocks) {
    const basePrice = stockBasePrices[stock.stockCode] || 100;
    await generateMockKLinesForStock(stock.stockCode, basePrice, 400);
  }

  console.log('\n🎉 Mock data generation completed!');
  console.log('\nYou can now view the charts at: http://localhost:5174/chart/600519');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
