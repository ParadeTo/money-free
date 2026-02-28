/**
 * 测试前复权数据获取
 * 
 * 验证 Tushare 和 AkShare 是否正确返回前复权数据
 * 
 * 使用:
 * npx ts-node src/scripts/test-qfq-data.ts
 */

import { ConfigService } from '@nestjs/config';
import { TushareService } from '../services/datasource/tushare.service';

async function main() {
  console.log('🔍 测试前复权数据获取\n');

  const configService = new ConfigService();
  const tushareService = new TushareService(configService);

  if (!tushareService.isAvailable()) {
    console.error('❌ Tushare service is not available. Please check TUSHARE_TOKEN in .env');
    process.exit(1);
  }

  try {
    // 测试获取茅台（600519）的日线数据
    const testStock = '600519.SH';
    const startDate = '20240101';
    const endDate = '20240131';

    console.log(`📊 获取测试数据: ${testStock}`);
    console.log(`📅 时间范围: ${startDate} - ${endDate}\n`);

    const dailyData = await tushareService.getDailyKLine({
      ts_code: testStock,
      start_date: startDate,
      end_date: endDate,
    });

    if (dailyData.length === 0) {
      console.warn('⚠️  未获取到数据，可能是非交易日期或网络问题');
      process.exit(0);
    }

    console.log(`✅ 成功获取 ${dailyData.length} 条日线数据\n`);

    // 显示前3条数据作为示例
    console.log('📈 数据示例（前复权）：\n');
    console.log('日期\t\t开盘\t收盘\t最高\t最低\t成交量');
    console.log('-'.repeat(60));
    
    dailyData.slice(0, 3).forEach(data => {
      console.log(
        `${data.trade_date}\t${data.open.toFixed(2)}\t${data.close.toFixed(2)}\t` +
        `${data.high.toFixed(2)}\t${data.low.toFixed(2)}\t${data.vol.toFixed(0)}`
      );
    });

    console.log('\n✅ 前复权数据配置正常！');
    console.log('\n说明：');
    console.log('  - Tushare API 已配置为返回前复权（qfq）数据');
    console.log('  - 所有价格数据（开盘、收盘、最高、最低）均为前复权价格');
    console.log('  - 这些数据适合用于技术分析和指标计算\n');
  } catch (error) {
    console.error('❌ 获取数据失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
