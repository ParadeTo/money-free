/**
 * 从 Tushare 获取A股股票列表并应用准入标准
 * 
 * 准入标准（分阶段实施）:
 * 阶段1（本脚本）：基本过滤
 *   - 排除ST、*ST股票
 *   - 上市时间 > 5年
 *   - 只保留主板、中小板、创业板（排除科创板688、北交所8开头）
 * 
 * 阶段2（获取K线时）：财务过滤
 *   - 市值 > 50亿元
 *   - 日均成交额 > 1000万元
 * 
 * 使用:
 * npx ts-node src/scripts/fetch-all-stocks.ts
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { TushareService } from '../services/datasource/tushare.service';

const prisma = new PrismaClient();

// 准入标准配置
const ADMISSION_CRITERIA = {
  minListingYears: 5,        // 最小上市年限
  excludeST: true,           // 排除ST股票
  excludeBoards: ['688', '8'], // 排除的板块代码前缀（科创板、北交所）
};

async function main() {
  console.log('📊 Fetching A-share stocks with admission criteria...\n');
  console.log('准入标准（阶段1 - 基本过滤）:');
  console.log(`  - 上市时间 > ${ADMISSION_CRITERIA.minListingYears}年`);
  console.log(`  - 排除ST、*ST股票`);
  console.log(`  - 只保留主板、中小板、创业板`);
  console.log(`  - 排除科创板（688开头）和北交所（8开头）\n`);
  console.log('说明：市值和成交额筛选将在获取K线数据后进行\n');

  const configService = new ConfigService();
  const tushareService = new TushareService(configService);

  if (!tushareService.isAvailable()) {
    console.error('❌ Tushare service is not available. Please check TUSHARE_TOKEN in .env');
    process.exit(1);
  }

  try {
    // 获取所有正常上市的股票
    console.log('🔍 Fetching all listed stocks...');
    const stockList = await tushareService.getStockBasic({
      list_status: 'L',
    });
    console.log(`✅ Found ${stockList.length} stocks\n`);

    // 应用基本过滤条件
    console.log('🔍 Applying filters...');
    const currentDate = new Date();
    
    const validStocks = stockList.filter(stock => {
      // 1. 排除ST股票
      if (ADMISSION_CRITERIA.excludeST && (stock.name.includes('ST') || stock.name.includes('退'))) {
        return false;
      }
      
      // 2. 只保留主板、中小板、创业板（排除科创板和北交所）
      const code = stock.symbol;
      if (ADMISSION_CRITERIA.excludeBoards.some(prefix => code.startsWith(prefix))) {
        return false;
      }
      
      // 3. 检查上市年限
      if (stock.list_date) {
        const listDate = new Date(
          stock.list_date.slice(0, 4) + '-' + 
          stock.list_date.slice(4, 6) + '-' + 
          stock.list_date.slice(6, 8)
        );
        const listingYears = (currentDate.getTime() - listDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
        if (listingYears < ADMISSION_CRITERIA.minListingYears) {
          return false;
        }
      }
      
      return true;
    });

    console.log(`✅ Passed filters: ${validStocks.length} stocks\n`);

    // 保存到数据库
    console.log('💾 Saving to database...\n');
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const stock of validStocks) {
      try {
        // ts_code 格式: 600519.SH
        const [stockCode, exchange] = stock.ts_code.split('.');
        const market = exchange; // SH or SZ

        const existing = await prisma.stock.findUnique({
          where: { stockCode },
        });

        const stockData = {
          stockCode,
          stockName: stock.name,
          market,
          industry: stock.industry || '未分类',
          listDate: stock.list_date ? new Date(
            stock.list_date.slice(0, 4) + '-' + 
            stock.list_date.slice(4, 6) + '-' + 
            stock.list_date.slice(6, 8)
          ) : new Date(),
          marketCap: null, // 将在获取K线时更新
          avgTurnover: null, // 将在获取K线时计算
          admissionStatus: 'active', // 基本条件已通过，后续可能根据市值/成交额调整
        };

        if (existing) {
          // 更新已存在的股票信息
          await prisma.stock.update({
            where: { stockCode },
            data: stockData,
          });
          updatedCount++;
        } else {
          // 创建新股票
          await prisma.stock.create({
            data: stockData,
          });
          addedCount++;
        }

        // 每处理100只股票显示一次进度
        if ((addedCount + updatedCount + skippedCount) % 100 === 0) {
          console.log(`⏳ Saved: ${addedCount + updatedCount + skippedCount}/${validStocks.length}`);
        }
      } catch (error) {
        console.error(`❌ Error saving ${stock.ts_code}:`, error instanceof Error ? error.message : error);
        skippedCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  ✅ Added: ${addedCount}`);
    console.log(`  🔄 Updated: ${updatedCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  📊 Total in DB: ${await prisma.stock.count()}`);

    console.log('\n🎉 Stock list import completed!');
  } catch (error) {
    console.error('❌ Failed to fetch stocks:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
