import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 添加测试股票数据
 * 用于开发和测试
 */
async function main() {
  console.log('🌱 Adding test stocks...');

  const testStocks = [
    {
      stockCode: '600519',
      stockName: '贵州茅台',
      market: 'SH',
      industry: '白酒',
      listDate: new Date('2001-08-27'),
      marketCap: 24000.0,
      avgTurnover: 500000.0,
      admissionStatus: 'active',
    },
    {
      stockCode: '000001',
      stockName: '平安银行',
      market: 'SZ',
      industry: '银行',
      listDate: new Date('1991-04-03'),
      marketCap: 3500.0,
      avgTurnover: 200000.0,
      admissionStatus: 'active',
    },
    {
      stockCode: '000858',
      stockName: '五粮液',
      market: 'SZ',
      industry: '白酒',
      listDate: new Date('1998-04-27'),
      marketCap: 6800.0,
      avgTurnover: 150000.0,
      admissionStatus: 'active',
    },
    {
      stockCode: '601318',
      stockName: '中国平安',
      market: 'SH',
      industry: '保险',
      listDate: new Date('2007-03-01'),
      marketCap: 8900.0,
      avgTurnover: 380000.0,
      admissionStatus: 'active',
    },
    {
      stockCode: '600036',
      stockName: '招商银行',
      market: 'SH',
      industry: '银行',
      listDate: new Date('2002-04-09'),
      marketCap: 12000.0,
      avgTurnover: 450000.0,
      admissionStatus: 'active',
    },
  ];

  for (const stock of testStocks) {
    try {
      const existing = await prisma.stock.findUnique({
        where: { stockCode: stock.stockCode },
      });

      if (existing) {
        console.log(`  ⏭️  ${stock.stockCode} ${stock.stockName} - already exists`);
        continue;
      }

      await prisma.stock.create({
        data: stock,
      });

      console.log(`  ✅ ${stock.stockCode} ${stock.stockName} - created`);
    } catch (error) {
      console.error(`  ❌ ${stock.stockCode} - failed:`, error);
    }
  }

  const totalStocks = await prisma.stock.count();
  console.log(`\n🎉 Test stocks added successfully! Total: ${totalStocks}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed to add test stocks:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
