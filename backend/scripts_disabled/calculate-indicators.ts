// backend/src/scripts/calculate-indicators.ts
// T109: Enhanced indicators calculation script with selective recalculation

import { PrismaClient } from '@prisma/client';
import { SMA, RSI } from 'technicalindicators';

const prisma = new PrismaClient();

interface CalculateIndicatorsOptions {
  stockCodes?: string[]; // Stock codes to calculate (default: all active)
  period?: 'daily' | 'weekly'; // Period type (default: daily)
  recalculate?: boolean; // Force recalculation (default: false)
}

interface KLineDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

async function calculateIndicators(options: CalculateIndicatorsOptions = {}) {
  const {
    stockCodes,
    period = 'daily',
    recalculate = false,
  } = options;

  console.log('=== Calculate Technical Indicators ===');
  console.log(`Period: ${period}`);
  console.log(`Mode: ${recalculate ? 'Full Recalculation' : 'Incremental'}`);

  // Get stocks to process
  const stocks = stockCodes
    ? await prisma.stock.findMany({
        where: { stockCode: { in: stockCodes } },
        select: { stockCode: true, stockName: true },
      })
    : await prisma.stock.findMany({
        where: { admissionStatus: 'active' },
        select: { stockCode: true, stockName: true },
      });

  console.log(`Processing ${stocks.length} stocks...`);

  let totalProcessed = 0;
  let totalFailed = 0;

  for (const stock of stocks) {
    try {
      // Fetch K-line data for this stock
      const klines = await prisma.klineData.findMany({
        where: { stockCode: stock.stockCode, period },
        orderBy: { date: 'asc' },
      });

      if (klines.length === 0) {
        console.log(`  ${stock.stockCode}: No K-line data, skipping`);
        continue;
      }

      // Delete existing indicators if recalculating
      if (recalculate) {
        await prisma.technicalIndicator.deleteMany({
          where: { stockCode: stock.stockCode, period },
        });
      }

      // Calculate indicators
      const indicators = calculateAllIndicators(klines as KLineDataPoint[], period);

      // Insert indicators
      if (indicators.length > 0) {
        await prisma.technicalIndicator.createMany({
          data: indicators.map((indicator) => ({
            ...indicator,
            stockCode: stock.stockCode,
            period,
          })),
          skipDuplicates: true,
        });

        totalProcessed++;
        console.log(
          `  ${stock.stockCode}: Calculated ${indicators.length} indicator records`,
        );
      }
    } catch (error) {
      totalFailed++;
      console.error(`  ${stock.stockCode}: Failed - ${error.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Successfully Processed: ${totalProcessed} stocks`);
  console.log(`Failed: ${totalFailed} stocks`);
}

function calculateAllIndicators(
  klines: KLineDataPoint[],
  period: 'daily' | 'weekly',
): any[] {
  const closePrices = klines.map((k) => k.close);
  const highPrices = klines.map((k) => k.high);
  const lowPrices = klines.map((k) => k.low);
  const volumes = klines.map((k) => k.volume);
  const amounts = klines.map((k) => k.amount);

  const indicators: any[] = [];

  // MA periods based on daily/weekly
  const maPeriods = period === 'daily' ? [50, 150, 200] : [10, 30, 40];

  for (let i = 0; i < klines.length; i++) {
    const date = klines[i].date;

    // 1. Moving Averages (MA)
    const maValues: any = {};
    for (const p of maPeriods) {
      if (i >= p - 1) {
        const ma = SMA.calculate({
          period: p,
          values: closePrices.slice(Math.max(0, i - p + 1), i + 1),
        });
        maValues[`ma${p}`] = ma[ma.length - 1];
      }
    }

    if (Object.keys(maValues).length > 0) {
      indicators.push({
        date,
        indicatorType: 'ma',
        values: JSON.stringify(maValues),
        calculatedAt: new Date(),
      });
    }

    // 2. KDJ (uses 9-period calculation)
    if (i >= 8) {
      const kdj = calculateKDJ(
        highPrices.slice(Math.max(0, i - 8), i + 1),
        lowPrices.slice(Math.max(0, i - 8), i + 1),
        closePrices.slice(Math.max(0, i - 8), i + 1),
      );

      indicators.push({
        date,
        indicatorType: 'kdj',
        values: JSON.stringify(kdj),
        calculatedAt: new Date(),
      });
    }

    // 3. RSI (14-period)
    if (i >= 13) {
      const rsiValues = RSI.calculate({
        period: 14,
        values: closePrices.slice(Math.max(0, i - 13), i + 1),
      });

      if (rsiValues.length > 0) {
        indicators.push({
          date,
          indicatorType: 'rsi',
          values: JSON.stringify({ value: rsiValues[rsiValues.length - 1] }),
          calculatedAt: new Date(),
        });
      }
    }

    // 4. Volume with 52-week MA
    if (i >= 251) {
      // 52 weeks = 260 trading days (approx)
      const volumeMA = SMA.calculate({
        period: 260,
        values: volumes.slice(Math.max(0, i - 259), i + 1),
      });

      indicators.push({
        date,
        indicatorType: 'volume',
        values: JSON.stringify({
          volume: volumes[i],
          ma52w: volumeMA[volumeMA.length - 1],
        }),
        calculatedAt: new Date(),
      });
    } else {
      indicators.push({
        date,
        indicatorType: 'volume',
        values: JSON.stringify({
          volume: volumes[i],
          ma52w: null,
        }),
        calculatedAt: new Date(),
      });
    }

    // 5. Amount with 52-week MA
    if (i >= 251) {
      const amountMA = SMA.calculate({
        period: 260,
        values: amounts.slice(Math.max(0, i - 259), i + 1),
      });

      indicators.push({
        date,
        indicatorType: 'amount',
        values: JSON.stringify({
          amount: amounts[i],
          ma52w: amountMA[amountMA.length - 1],
        }),
        calculatedAt: new Date(),
      });
    } else {
      indicators.push({
        date,
        indicatorType: 'amount',
        values: JSON.stringify({
          amount: amounts[i],
          ma52w: null,
        }),
        calculatedAt: new Date(),
      });
    }
  }

  // 6. 52-week high/low markers (calculate once for the entire dataset)
  if (klines.length >= 260) {
    const last260Days = klines.slice(-260);
    const high = Math.max(...last260Days.map((k) => k.high));
    const low = Math.min(...last260Days.map((k) => k.low));
    const highDate = last260Days.find((k) => k.high === high)?.date;
    const lowDate = last260Days.find((k) => k.low === low)?.date;

    indicators.push({
      date: klines[klines.length - 1].date,
      indicatorType: 'week52_marker',
      values: JSON.stringify({
        high,
        low,
        highDate: highDate?.toISOString().split('T')[0],
        lowDate: lowDate?.toISOString().split('T')[0],
      }),
      calculatedAt: new Date(),
    });
  }

  return indicators;
}

function calculateKDJ(
  high: number[],
  low: number[],
  close: number[],
): { k: number; d: number; j: number } {
  // Simple KDJ calculation (9-period)
  const n = high.length;
  const highMax = Math.max(...high);
  const lowMin = Math.min(...low);

  const rsv = highMax === lowMin 
    ? 50 
    : ((close[n - 1] - lowMin) / (highMax - lowMin)) * 100;

  // K = 2/3 × previous K + 1/3 × RSV (start with 50)
  // D = 2/3 × previous D + 1/3 × K (start with 50)
  // J = 3K - 2D

  const k = rsv; // Simplified for now
  const d = rsv; // Simplified for now
  const j = 3 * k - 2 * d;

  return { k, d, j };
}

// Parse command line arguments
function parseArgs(): CalculateIndicatorsOptions {
  const args = process.argv.slice(2);
  const options: CalculateIndicatorsOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--stocks':
        options.stockCodes = args[++i].split(',');
        break;
      case '--period':
        options.period = args[++i] as 'daily' | 'weekly';
        break;
      case '--recalculate':
        options.recalculate = true;
        break;
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  calculateIndicators(options)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { calculateIndicators, CalculateIndicatorsOptions };
