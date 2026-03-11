import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VcpEarlyFilterService } from '../services/vcp/vcp-early-filter.service';
import { FilterConditions, DEFAULT_FILTER_CONDITIONS } from '../types/vcp-early-stage';
import { Command } from 'commander';

interface CliOptions {
  lowThreshold?: string;
  highThreshold?: string;
  minContraction?: string;
  maxContraction?: string;
  verbose?: boolean;
}

async function main() {
  const program = new Command();

  program
    .name('show-vcp-early-stage')
    .description('显示早期启动阶段的VCP股票')
    .version('1.0.0')
    .option('--low-threshold <number>', '距52周低点阈值（%），范围20-60', String(DEFAULT_FILTER_CONDITIONS.distFrom52WeekLow))
    .option('--high-threshold <number>', '距52周高点阈值（%），范围10-50', String(DEFAULT_FILTER_CONDITIONS.distFrom52WeekHigh))
    .option('--min-contraction <number>', '最小收缩次数，范围2-8', String(DEFAULT_FILTER_CONDITIONS.contractionCountMin))
    .option('--max-contraction <number>', '最大收缩次数，范围2-8', String(DEFAULT_FILTER_CONDITIONS.contractionCountMax))
    .option('--verbose', '显示详细日志')
    .parse(process.argv);

  const options: CliOptions = program.opts();

  const conditions: FilterConditions = {
    distFrom52WeekLow: options.lowThreshold ? parseFloat(options.lowThreshold) : DEFAULT_FILTER_CONDITIONS.distFrom52WeekLow,
    distFrom52WeekHigh: options.highThreshold ? parseFloat(options.highThreshold) : DEFAULT_FILTER_CONDITIONS.distFrom52WeekHigh,
    contractionCountMin: options.minContraction ? parseInt(options.minContraction) : DEFAULT_FILTER_CONDITIONS.contractionCountMin,
    contractionCountMax: options.maxContraction ? parseInt(options.maxContraction) : DEFAULT_FILTER_CONDITIONS.contractionCountMax,
  };

  if (options.verbose) {
    console.log('筛选条件:', JSON.stringify(conditions, null, 2));
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: options.verbose ? ['log', 'error', 'warn'] : ['error'],
  });

  const filterService = app.get(VcpEarlyFilterService);

  try {
    const result = await filterService.filterEarlyStage(conditions);

    console.log('\n='.repeat(100));
    console.log(`VCP 早期启动阶段股票筛选结果 (共 ${result.total} 只)`);
    console.log('='.repeat(100));
    console.log(`筛选条件: 距52周低≤${conditions.distFrom52WeekLow}% | 距52周高≤${conditions.distFrom52WeekHigh}% (接近高点) | 收缩${conditions.contractionCountMin}-${conditions.contractionCountMax}次`);
    console.log('='.repeat(100));

    if (result.tip) {
      const tipSymbol = result.tip.type === 'error' ? '❌' : result.tip.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`\n${tipSymbol} ${result.tip.message}`);
      if (result.tip.suggestedActions.length > 0) {
        console.log('   建议操作:');
        result.tip.suggestedActions.forEach((action, i) => {
          console.log(`   ${i + 1}. ${action.label}`);
        });
      }
      console.log();
    }

    if (result.stocks.length === 0) {
      console.log('\n未找到符合条件的股票\n');
      await app.close();
      return;
    }

    const stageGroups = {
      contraction: result.stocks.filter(s => s.vcpStage === 'contraction'),
      in_pullback: result.stocks.filter(s => s.vcpStage === 'in_pullback'),
      pullback_ended: result.stocks.filter(s => s.vcpStage === 'pullback_ended'),
    };

    if (stageGroups.contraction.length > 0) {
      console.log('\n🟢 【收缩中】- 最佳介入时机');
      console.log('-'.repeat(100));
      printStockTable(stageGroups.contraction, true);
    }

    if (stageGroups.in_pullback.length > 0) {
      console.log('\n🟡 【回调中】- 观察等待');
      console.log('-'.repeat(100));
      printStockTable(stageGroups.in_pullback, false);
    }

    if (stageGroups.pullback_ended.length > 0) {
      console.log('\n🟠 【回调结束】- 可能启动');
      console.log('-'.repeat(100));
      printStockTable(stageGroups.pullback_ended, false);
    }

    console.log('\n' + '='.repeat(100) + '\n');

  } catch (error: any) {
    console.error(`\n错误: ${error.message}\n`);
    if (options.verbose) {
      console.error(error.stack);
    }
    await app.close();
    process.exit(1);
  }

  await app.close();
}

function printStockTable(stocks: any[], highlight: boolean) {
  const header = [
    '代码'.padEnd(10),
    '名称'.padEnd(10),
    '最新价'.padStart(8),
    '涨幅%'.padStart(7),
    '距52周低%'.padStart(10),
    '距52周高%'.padStart(10),
    '收缩次数'.padStart(8),
    '收缩幅度%'.padStart(10),
    'RS评分'.padStart(7),
    '成交量萎缩'.padStart(10),
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(100));

  stocks.forEach((stock) => {
    const row = [
      stock.stockCode.padEnd(10),
      stock.stockName.padEnd(10),
      stock.latestPrice.toFixed(2).padStart(8),
      (stock.priceChangePct >= 0 ? '+' : '') + stock.priceChangePct.toFixed(2).padStart(6),
      stock.distFrom52WeekLow.toFixed(2).padStart(10),
      stock.distFrom52WeekHigh.toFixed(2).padStart(10),
      String(stock.contractionCount).padStart(8),
      stock.lastContractionPct.toFixed(2).padStart(10),
      String(stock.rsRating).padStart(7),
      (stock.volumeDryingUp ? '是' : '否').padStart(10),
    ].join(' | ');

    if (highlight) {
      console.log(`⭐ ${row}`);
    } else {
      console.log(`   ${row}`);
    }

    if (stock.pullbackInfo) {
      const pb = stock.pullbackInfo;
      console.log(`      └─ 回调: ${pb.pullbackPct.toFixed(2)}% (${pb.durationDays}天) | 低点: ${pb.lowDate} (${pb.daysSinceLow}天前) | 反弹: ${pb.recoveryPct.toFixed(2)}%`);
    }
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
