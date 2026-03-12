import { Injectable } from '@nestjs/common';
import { VcpAnalysis, Contraction, Pullback, KLine } from '../../types/vcp';

/**
 * Format options for VCP analysis output
 */
export interface FormatOptions {
  locale?: 'zh-CN' | 'en-US';
  colorOutput?: boolean;
  maxContractions?: number;
  maxPullbacks?: number;
}

/**
 * VCP Formatter Service
 * 
 * Formats VCP analysis results for different output formats:
 * - Text format (for command-line scripts)
 * - Display format (for frontend rendering)
 */
@Injectable()
export class VcpFormatterService {
  /**
   * Format VCP analysis to text report (for command-line output)
   * 
   * @param analysis VCP analysis result
   * @param options Format options
   * @returns Formatted text report in Chinese
   */
  formatToText(analysis: VcpAnalysis, options?: FormatOptions): string {
    const opts: Required<FormatOptions> = {
      locale: options?.locale || 'zh-CN',
      colorOutput: options?.colorOutput !== undefined ? options.colorOutput : true,
      maxContractions: options?.maxContractions || Number.MAX_SAFE_INTEGER,
      maxPullbacks: options?.maxPullbacks || Number.MAX_SAFE_INTEGER,
    };

    const sections: string[] = [];

    // Header
    sections.push(this.formatHeader(analysis));

    // Summary
    sections.push(this.formatSummary(analysis));

    // Contractions
    if (analysis.contractions.length > 0) {
      sections.push(this.formatContractionTable(analysis.contractions, opts.maxContractions));
    }

    // Pullbacks
    if (analysis.pullbacks.length > 0) {
      sections.push(this.formatPullbackTable(analysis.pullbacks, opts.maxPullbacks));
    }

    // K-Line data
    if (analysis.klines.length > 0) {
      sections.push(this.formatKLineTable(analysis.klines, 10));
    }

    // Trend template
    sections.push(this.formatTrendTemplate(analysis));

    return sections.join('\n\n');
  }

  /**
   * Format header section
   */
  private formatHeader(analysis: VcpAnalysis): string {
    const lines: string[] = [];
    lines.push('='.repeat(100));
    lines.push(`📈 VCP 形态分析 - ${analysis.stockName} (${analysis.stockCode})`);
    lines.push('='.repeat(100));

    if (analysis.cached) {
      lines.push(`\n📊 缓存结果 (扫描日期: ${analysis.scanDate})`);
      if (analysis.isExpired) {
        lines.push('⚠️  数据已过期 (>7天)');
      }
    } else {
      lines.push(`\n📊 实时分析 (${analysis.scanDate})`);
    }

    return lines.join('\n');
  }

  /**
   * Format summary section
   */
  private formatSummary(analysis: VcpAnalysis): string {
    const { summary, hasVcp } = analysis;
    const lines: string[] = [];

    lines.push('─'.repeat(100));
    lines.push('📋 VCP 形态摘要\n');
    lines.push(`  VCP形态: ${hasVcp ? '✅ 有效' : '❌ 无效'}`);
    lines.push(`  收缩次数: ${summary.contractionCount}`);
    lines.push(`  最后收缩幅度: ${summary.lastContractionPct.toFixed(2)}%`);
    lines.push(`  成交量萎缩: ${summary.volumeDryingUp ? '是' : '否'}`);
    lines.push(`  RS评分: ${summary.rsRating}`);
    lines.push(`  处于回调: ${summary.inPullback ? '是' : '否'}`);
    lines.push(`  回调次数: ${summary.pullbackCount}`);
    lines.push(`  最新价格: ${summary.latestPrice.toFixed(2)}`);
    lines.push(`  涨跌幅: ${summary.priceChangePct.toFixed(2)}%`);
    lines.push(`  距52周高点: ${summary.distFrom52WeekHigh.toFixed(2)}%`);
    lines.push(`  距52周低点: ${summary.distFrom52WeekLow.toFixed(2)}%`);

    return lines.join('\n');
  }

  /**
   * Format contraction table
   */
  private formatContractionTable(contractions: Contraction[], maxCount: number): string {
    const lines: string[] = [];
    const displayContractions = contractions.slice(0, maxCount);

    lines.push('─'.repeat(100));
    lines.push(`📉 收缩阶段详情 (${contractions.length} 个)\n`);

    displayContractions.forEach((c, i) => {
      lines.push(`  [收缩 ${c.index}]`);
      lines.push(`    期间: ${c.swingHighDate} → ${c.swingLowDate}`);
      lines.push(`    高点: ${c.swingHighPrice.toFixed(2)}`);
      lines.push(`    低点: ${c.swingLowPrice.toFixed(2)}`);
      lines.push(`    幅度: ${c.depthPct.toFixed(2)}%`);
      lines.push(`    持续: ${c.durationDays} 天`);
      lines.push(`    平均成交量: ${(c.avgVolume / 100).toFixed(0)} 手`);
      if (i < displayContractions.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  /**
   * Format pullback table
   */
  private formatPullbackTable(pullbacks: Pullback[], maxCount: number): string {
    const lines: string[] = [];
    const displayPullbacks = pullbacks.slice(0, maxCount);

    lines.push('─'.repeat(100));
    lines.push(`📈 回调阶段详情 (${pullbacks.length} 个)\n`);

    displayPullbacks.forEach((p, i) => {
      const status = p.daysSinceLow === 0 ? '🔴 正在回调中' : 
                     p.daysSinceLow <= 3 ? `🟡 ${p.daysSinceLow}天前到达最低点` :
                     `🟢 ${p.daysSinceLow}天前到达最低点`;

      lines.push(`  [回调 ${p.index}] ${status}`);
      lines.push(`    期间: ${p.highDate} → ${p.lowDate}`);
      lines.push(`    高点: ${p.highPrice.toFixed(2)}`);
      lines.push(`    低点: ${p.lowPrice.toFixed(2)}`);
      lines.push(`    幅度: ${p.pullbackPct.toFixed(2)}%`);
      lines.push(`    持续: ${p.durationDays} 天`);
      lines.push(`    上升趋势中: ${p.isInUptrend ? '是' : '否'}`);
      lines.push(`    平均成交量: ${(p.avgVolume / 100).toFixed(0)} 手`);
      if (i < displayPullbacks.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  /**
   * Format K-Line data table
   */
  private formatKLineTable(klines: KLine[], count: number): string {
    const lines: string[] = [];
    const recentKLines = klines.slice(-count);

    lines.push('─'.repeat(100));
    lines.push(`📅 最近 ${recentKLines.length} 天K线数据\n`);

    // Table header
    const header = [
      '日期'.padEnd(12),
      '开盘'.padStart(10),
      '最高'.padStart(10),
      '最低'.padStart(10),
      '收盘'.padStart(10),
      '涨跌幅%'.padStart(10),
      '成交量(手)'.padStart(12),
    ].join(' | ');
    lines.push(header);
    lines.push('-'.repeat(100));

    // Table rows
    recentKLines.forEach((k) => {
      const row = [
        k.date.padEnd(12),
        k.open.toFixed(2).padStart(10),
        k.high.toFixed(2).padStart(10),
        k.low.toFixed(2).padStart(10),
        k.close.toFixed(2).padStart(10),
        k.changePct.toFixed(2).padStart(10),
        (k.volume / 100).toFixed(0).padStart(12),
      ].join(' | ');
      lines.push(row);
    });

    return lines.join('\n');
  }

  /**
   * Format trend template section
   */
  private formatTrendTemplate(analysis: VcpAnalysis): string {
    const { trendTemplate } = analysis;
    const lines: string[] = [];

    lines.push('─'.repeat(100));
    lines.push(`📊 趋势模板检查: ${trendTemplate.pass ? '✅ 通过' : '❌ 未通过'}\n`);

    trendTemplate.checks.forEach((check) => {
      const icon = check.pass ? '  ✓' : '  ✗';
      lines.push(`${icon} ${check.name}`);
      if (check.description) {
        lines.push(`      ${check.description}`);
      }
    });

    return lines.join('\n');
  }
}
