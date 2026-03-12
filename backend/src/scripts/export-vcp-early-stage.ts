import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VcpEarlyFilterService } from '../services/vcp/vcp-early-filter.service';
import { FilterConditions, DEFAULT_FILTER_CONDITIONS } from '../types/vcp-early-stage';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

interface CliOptions {
  lowThreshold?: string;
  highThreshold?: string;
  minContraction?: string;
  maxContraction?: string;
  output?: string;
  verbose?: boolean;
}

async function main() {
  const program = new Command();

  program
    .name('export-vcp-early-stage')
    .description('导出早期启动阶段的VCP股票到Markdown文档')
    .version('1.0.0')
    .option('--low-threshold <number>', '距52周低点阈值（%），范围20-60', String(DEFAULT_FILTER_CONDITIONS.distFrom52WeekLow))
    .option('--high-threshold <number>', '距52周高点阈值（%），范围10-50', String(DEFAULT_FILTER_CONDITIONS.distFrom52WeekHigh))
    .option('--min-contraction <number>', '最小收缩次数，范围2-8', String(DEFAULT_FILTER_CONDITIONS.contractionCountMin))
    .option('--max-contraction <number>', '最大收缩次数，范围2-8', String(DEFAULT_FILTER_CONDITIONS.contractionCountMax))
    .option('-o, --output <path>', '输出文件路径', '')
    .option('--verbose', '显示详细日志')
    .parse(process.argv);

  const options: CliOptions = program.opts();

  const conditions: FilterConditions = {
    distFrom52WeekLow: options.lowThreshold ? parseFloat(options.lowThreshold) : DEFAULT_FILTER_CONDITIONS.distFrom52WeekLow,
    distFrom52WeekHigh: options.highThreshold ? parseFloat(options.highThreshold) : DEFAULT_FILTER_CONDITIONS.distFrom52WeekHigh,
    contractionCountMin: options.minContraction ? parseInt(options.minContraction) : DEFAULT_FILTER_CONDITIONS.contractionCountMin,
    contractionCountMax: options.maxContraction ? parseInt(options.maxContraction) : DEFAULT_FILTER_CONDITIONS.contractionCountMax,
  };

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: options.verbose ? ['log', 'error', 'warn'] : ['error'],
  });

  const filterService = app.get(VcpEarlyFilterService);

  try {
    const result = await filterService.filterEarlyStage(conditions);

    const today = new Date().toISOString().split('T')[0];
    const defaultOutput = path.join(
      process.cwd(),
      '..',
      'docs',
      'vcp',
      'daily-reports',
      today,
      `VCP选股-早期启动-${today}.md`
    );
    const outputPath = options.output || defaultOutput;

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const markdown = generateMarkdown(result, conditions, today);

    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`\n✅ 成功导出 ${result.total} 只股票到: ${outputPath}\n`);

    if (result.tip) {
      console.log(`💡 ${result.tip.message}\n`);
    }

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

function generateMarkdown(result: any, conditions: FilterConditions, date: string): string {
  const lines: string[] = [];

  lines.push(`# VCP选股报告 - 早期启动阶段`);
  lines.push('');
  lines.push(`**生成日期**: ${date}`);
  lines.push(`**总数量**: ${result.total} 只`);
  lines.push('');
  lines.push('## 筛选条件');
  lines.push('');
  lines.push(`- **距52周低点**: ≤ ${conditions.distFrom52WeekLow}% (还有上涨空间)`);
  lines.push(`- **距52周高点**: ≤ ${conditions.distFrom52WeekHigh}% (接近高点，强势股)`);
  lines.push(`- **收缩次数**: ${conditions.contractionCountMin}-${conditions.contractionCountMax} 次`);
  lines.push('');

  if (result.tip) {
    const tipEmoji = result.tip.type === 'error' ? '❌' : result.tip.type === 'warning' ? '⚠️' : 'ℹ️';
    lines.push('## 智能提示');
    lines.push('');
    lines.push(`${tipEmoji} **${result.tip.message}**`);
    if (result.tip.suggestedActions.length > 0) {
      lines.push('');
      lines.push('建议操作:');
      result.tip.suggestedActions.forEach((action: any) => {
        lines.push(`- ${action.label}`);
      });
    }
    lines.push('');
  }

  if (result.stocks.length === 0) {
    lines.push('## 结果');
    lines.push('');
    lines.push('未找到符合条件的股票。');
    return lines.join('\n');
  }

  const stageGroups = {
    contraction: result.stocks.filter((s: any) => s.vcpStage === 'contraction'),
    in_pullback: result.stocks.filter((s: any) => s.vcpStage === 'in_pullback'),
    pullback_ended: result.stocks.filter((s: any) => s.vcpStage === 'pullback_ended'),
  };

  lines.push('## 统计概览');
  lines.push('');
  lines.push(`- 🟢 **收缩中**: ${stageGroups.contraction.length} 只 (最佳介入时机)`);
  lines.push(`- 🟡 **回调中**: ${stageGroups.in_pullback.length} 只 (观察等待)`);
  lines.push(`- 🟠 **回调结束**: ${stageGroups.pullback_ended.length} 只 (可能启动)`);
  lines.push('');

  if (stageGroups.contraction.length > 0) {
    lines.push('## 🟢 收缩中 - 最佳介入时机');
    lines.push('');
    lines.push(generateStockTable(stageGroups.contraction));
    lines.push('');
  }

  if (stageGroups.in_pullback.length > 0) {
    lines.push('## 🟡 回调中 - 观察等待');
    lines.push('');
    lines.push(generateStockTable(stageGroups.in_pullback));
    lines.push('');
  }

  if (stageGroups.pullback_ended.length > 0) {
    lines.push('## 🟠 回调结束 - 可能启动');
    lines.push('');
    lines.push(generateStockTable(stageGroups.pullback_ended));
    lines.push('');
  }

  lines.push('## 投资建议');
  lines.push('');
  lines.push('1. **优先关注"收缩中"股票**: 这些股票正在构筑VCP形态，波动性收缩，是早期介入的最佳时机');
  lines.push('2. **距52周低点越近越好**: 说明股票还处于底部区域，上涨空间更大');
  lines.push('3. **结合基本面分析**: VCP形态是技术分析工具，建议配合公司基本面、行业趋势等进行综合判断');
  lines.push('4. **设置止损位**: 建议在最后一次收缩的低点下方设置止损位');
  lines.push('5. **分批建仓**: 可以在收缩过程中分批买入，降低成本');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*本报告由VCP早期启动阶段筛选系统自动生成，仅供参考，不构成投资建议。*');

  return lines.join('\n');
}

function generateStockTable(stocks: any[]): string {
  const lines: string[] = [];

  lines.push('| 代码 | 名称 | 最新价 | 涨幅% | 距52周低% | 距52周高% | 收缩次数 | 收缩幅度% | RS评分 | 成交量萎缩 |');
  lines.push('|------|------|--------|-------|-----------|-----------|----------|-----------|--------|-----------|');

  stocks.forEach((stock: any) => {
    const priceChange = stock.priceChangePct >= 0 ? `+${stock.priceChangePct.toFixed(2)}` : stock.priceChangePct.toFixed(2);
    const volumeDryUp = stock.volumeDryingUp ? '是' : '否';

    lines.push(`| ${stock.stockCode} | ${stock.stockName} | ${stock.latestPrice.toFixed(2)} | ${priceChange} | ${stock.distFrom52WeekLow.toFixed(2)} | ${stock.distFrom52WeekHigh.toFixed(2)} | ${stock.contractionCount} | ${stock.lastContractionPct.toFixed(2)} | ${stock.rsRating} | ${volumeDryUp} |`);

    if (stock.pullbackInfo) {
      const pb = stock.pullbackInfo;
      lines.push(`| | *回调详情* | 幅度: ${pb.pullbackPct.toFixed(2)}% | 持续: ${pb.durationDays}天 | 低点: ${pb.lowDate} | 距今: ${pb.daysSinceLow}天 | 反弹: ${pb.recoveryPct.toFixed(2)}% | | | |`);
    }
  });

  return lines.join('\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
