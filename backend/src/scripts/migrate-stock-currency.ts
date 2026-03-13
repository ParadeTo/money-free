/**
 * 数据迁移脚本：为现有A股数据设置默认currency='CNY'
 * 
 * 用途：在扩展支持港股和美股前，确保现有A股数据的currency字段正确设置
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStockCurrency() {
  console.log('开始迁移股票currency字段...\n');

  try {
    // 查询现有A股数量
    const aShareCount = await prisma.stock.count({
      where: {
        market: {
          in: ['SH', 'SZ'],
        },
      },
    });

    console.log(`📊 发现 ${aShareCount} 只A股需要更新currency字段`);

    if (aShareCount === 0) {
      console.log('✅ 没有需要更新的数据');
      return;
    }

    // 批量更新A股的currency为CNY
    const result = await prisma.stock.updateMany({
      where: {
        market: {
          in: ['SH', 'SZ'],
        },
      },
      data: {
        currency: 'CNY',
      },
    });

    console.log(`✅ 成功更新 ${result.count} 只股票的currency字段为'CNY'\n`);

    // 验证更新结果
    const verifyCount = await prisma.stock.count({
      where: {
        market: {
          in: ['SH', 'SZ'],
        },
        currency: 'CNY',
      },
    });

    console.log(`✅ 验证完成：${verifyCount}/${aShareCount} 只A股的currency='CNY'`);

    if (verifyCount !== aShareCount) {
      console.error(`⚠️  警告：部分数据未正确更新 (${verifyCount}/${aShareCount})`);
      process.exit(1);
    }

    console.log('\n🎉 迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateStockCurrency();
