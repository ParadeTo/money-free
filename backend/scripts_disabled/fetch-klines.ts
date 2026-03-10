// backend/src/scripts/fetch-klines.ts
// T108: Enhanced K-line fetching script with incremental mode support

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface FetchKLinesOptions {
  stocks?: string[]; // Stock codes to fetch (default: all active)
  startDate?: Date; // Start date (default: last update date or 20 years ago)
  endDate?: Date; // End date (default: today)
  period?: 'daily' | 'weekly'; // Period type (default: daily)
  incremental?: boolean; // Incremental mode (default: false)
}

interface TushareKLineResponse {
  code: number;
  msg: string;
  data: {
    fields: string[];
    items: any[][];
  };
}

async function fetchKLines(options: FetchKLinesOptions = {}) {
  const {
    stocks: stockCodes,
    startDate,
    endDate = new Date(),
    period = 'daily',
    incremental = false,
  } = options;

  console.log('=== Fetch K-Lines Script ===');
  console.log(`Mode: ${incremental ? 'Incremental' : 'Full'}`);
  console.log(`Period: ${period}`);
  console.log(`End Date: ${endDate.toISOString().split('T')[0]}`);

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

  let totalFetched = 0;
  let totalFailed = 0;

  for (const stock of stocks) {
    try {
      // Determine start date
      let effectiveStartDate = startDate;

      if (incremental || !effectiveStartDate) {
        // Find last K-line date for this stock
        const lastKLine = await prisma.klineData.findFirst({
          where: { stockCode: stock.stockCode, period },
          orderBy: { date: 'desc' },
        });

        if (lastKLine) {
          // Start from next day
          effectiveStartDate = new Date(lastKLine.date.getTime() + 86400000);
        } else {
          // No data yet, fetch from 20 years ago
          effectiveStartDate = new Date(Date.now() - 20 * 365 * 86400000);
        }
      }

      // Skip if start date is after end date
      if (effectiveStartDate >= endDate) {
        console.log(`  ${stock.stockCode}: Already up to date`);
        continue;
      }

      // Fetch K-line data from Tushare
      const klines = await fetchFromTushare(
        stock.stockCode,
        effectiveStartDate,
        endDate,
        period,
      );

      if (klines.length > 0) {
        // Insert K-line data
        await prisma.klineData.createMany({
          data: klines,
          skipDuplicates: true,
        });

        totalFetched += klines.length;
        console.log(`  ${stock.stockCode}: Fetched ${klines.length} records`);
      } else {
        console.log(`  ${stock.stockCode}: No new data`);
      }

      // Rate limiting: wait 100ms between requests
      await sleep(100);
    } catch (error) {
      totalFailed++;
      console.error(
        `  ${stock.stockCode}: Failed - ${error.message}`,
      );
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total Records Fetched: ${totalFetched}`);
  console.log(`Failed Stocks: ${totalFailed}`);
}

async function fetchFromTushare(
  stockCode: string,
  startDate: Date,
  endDate: Date,
  period: 'daily' | 'weekly',
): Promise<any[]> {
  const tushareToken = process.env.TUSHARE_TOKEN;

  if (!tushareToken) {
    throw new Error('TUSHARE_TOKEN not configured');
  }

  const apiUrl = 'https://api.tushare.pro';
  const apiName = period === 'daily' ? 'daily' : 'weekly';

  // Convert dates to YYYYMMDD format
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  try {
    const response = await axios.post<TushareKLineResponse>(apiUrl, {
      api_name: apiName,
      token: tushareToken,
      params: {
        ts_code: convertStockCode(stockCode),
        start_date: startStr,
        end_date: endStr,
      },
      fields: 'trade_date,open,high,low,close,vol,amount',
    });

    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }

    // Transform data
    const items = response.data.data?.items || [];
    return items.map((item) => ({
      stockCode,
      date: parseDate(item[0]),
      period,
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]) * 100, // Convert to shares (Tushare returns in hundreds)
      amount: parseFloat(item[6]), // Already in yuan
      source: 'tushare',
      createdAt: new Date(),
    }));
  } catch (error) {
    // Fallback to AkShare (via Python bridge) if Tushare fails
    console.warn(`Tushare failed for ${stockCode}, trying AkShare...`);
    return fetchFromAkShare(stockCode, startDate, endDate, period);
  }
}

async function fetchFromAkShare(
  stockCode: string,
  startDate: Date,
  endDate: Date,
  period: 'daily' | 'weekly',
): Promise<any[]> {
  // Placeholder: This will call Python bridge in the actual implementation
  // For now, return empty array
  console.warn(`AkShare fallback not yet implemented for ${stockCode}`);
  return [];
}

function convertStockCode(stockCode: string): string {
  // Convert "600519" to "600519.SH" or "000001" to "000001.SZ"
  const market = stockCode.startsWith('6') ? 'SH' : 'SZ';
  return `${stockCode}.${market}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function parseDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse command line arguments
function parseArgs(): FetchKLinesOptions {
  const args = process.argv.slice(2);
  const options: FetchKLinesOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--stocks':
        options.stocks = args[++i].split(',');
        break;
      case '--start-date':
        options.startDate = new Date(args[++i]);
        break;
      case '--end-date':
        options.endDate = new Date(args[++i]);
        break;
      case '--period':
        options.period = args[++i] as 'daily' | 'weekly';
        break;
      case '--incremental':
        options.incremental = true;
        break;
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  fetchKLines(options)
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

export { fetchKLines, FetchKLinesOptions };
