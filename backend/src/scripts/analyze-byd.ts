#!/usr/bin/env ts-node
/**
 * 比亚迪(002594) VCP分析脚本
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VcpService } from '../modules/vcp/vcp.service';

async function analyzeBYD() {
  console.log('📊 比亚迪(002594) VCP分析\n');
  console.log('='.repeat(80));

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const vcpService = app.get(VcpService);

    // 生成VCP分析报告
    const analysis = await vcpService.generateAnalysis('002594', false);

    // 打印基本信息
    console.log('\n📈 基本信息');
    console.log('-'.repeat(80));
    console.log(`股票代码: ${analysis.stockCode}`);
    console.log(`股票名称: ${analysis.stockName}`);
    console.log(`市场: ${analysis.market}`);
    console.log(`货币: ${analysis.currency}`);
    console.log(`扫描日期: ${analysis.scanDate}`);
    console.log(`数据来源: ${analysis.cached ? '缓存' : '实时计算'}`);
    console.log(`数据过期: ${analysis.isExpired ? '是(>7天)' : '否'}`);

    // VCP 状态
    console.log('\n🔍 VCP 状态');
    console.log('-'.repeat(80));
    console.log(`VCP 形态: ${analysis.hasVcp ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`收缩次数: ${analysis.summary.contractionCount}次`);
    console.log(`最后收缩幅度: ${analysis.summary.lastContractionPct.toFixed(2)}%`);
    console.log(`成交量枯竭: ${analysis.summary.volumeDryingUp ? '✅ 是' : '❌ 否'}`);
    console.log(`RS评分: ${analysis.summary.rsRating.toFixed(2)}`);

    // 回调状态
    console.log('\n📉 回调状态');
    console.log('-'.repeat(80));
    console.log(`处于回调中: ${analysis.summary.inPullback ? '✅ 是' : '❌ 否'}`);
    console.log(`回调次数: ${analysis.summary.pullbackCount}次`);

    if (analysis.pullbacks && analysis.pullbacks.length > 0) {
      console.log('\n最近的回调:');
      analysis.pullbacks.slice(-3).forEach((p, i) => {
        console.log(`\n  回调 #${p.index}:`);
        console.log(`    高点: ${p.highDate} @ ¥${p.highPrice.toFixed(2)}`);
        console.log(`    低点: ${p.lowDate} @ ¥${p.lowPrice.toFixed(2)}`);
        console.log(`    回调幅度: ${p.pullbackPct.toFixed(2)}%`);
        console.log(`    持续天数: ${p.durationDays}天`);
        console.log(`    距离低点: ${p.daysSinceLow}天`);
        console.log(`    上升趋势中: ${p.isInUptrend ? '✅' : '❌'}`);
      });
    }

    // 价格信息
    console.log('\n💰 价格信息');
    console.log('-'.repeat(80));
    console.log(`最新价格: ¥${analysis.summary.latestPrice.toFixed(2)}`);
    console.log(
      `日涨跌幅: ${analysis.summary.priceChangePct >= 0 ? '+' : ''}${analysis.summary.priceChangePct.toFixed(2)}%`,
    );
    console.log(`距52周高点: ${analysis.summary.distFrom52WeekHigh.toFixed(2)}%`);
    console.log(`距52周低点: ${analysis.summary.distFrom52WeekLow.toFixed(2)}%`);

    // 收缩详情
    if (analysis.contractions && analysis.contractions.length > 0) {
      console.log('\n📊 收缩详情');
      console.log('-'.repeat(80));
      analysis.contractions.forEach((c) => {
        console.log(`\n  收缩 #${c.index}:`);
        console.log(`    高点: ${c.swingHighDate} @ ¥${c.swingHighPrice.toFixed(2)}`);
        console.log(`    低点: ${c.swingLowDate} @ ¥${c.swingLowPrice.toFixed(2)}`);
        console.log(`    收缩幅度: ${c.depthPct.toFixed(2)}%`);
        console.log(`    持续天数: ${c.durationDays}天`);
        console.log(`    平均成交量: ${(c.avgVolume / 10000).toFixed(2)}万手`);
      });
    }

    // 趋势模板检查
    if (analysis.trendTemplate) {
      console.log('\n📐 趋势模板检查');
      console.log('-'.repeat(80));
      console.log(`通过趋势模板: ${analysis.trendTemplate.pass ? '✅ 是' : '❌ 否'}`);

      if (analysis.trendTemplate.checks && analysis.trendTemplate.checks.length > 0) {
        analysis.trendTemplate.checks.forEach((check: any) => {
          const status = check.pass ? '✅' : '❌';
          console.log(`  ${status} ${check.name}: ${check.description}`);
        });
      }
    }

    // 最近K线
    if (analysis.klines && analysis.klines.length > 0) {
      console.log('\n📅 最近10个交易日K线');
      console.log('-'.repeat(80));
      console.log('日期          开盘    最高    最低    收盘    成交量(万手)  涨跌幅');
      console.log('-'.repeat(80));
      analysis.klines.slice(-10).forEach((k) => {
        const volumeStr = (k.volume / 10000).toFixed(2).padStart(12);
        const changePctStr = `${k.changePct >= 0 ? '+' : ''}${k.changePct.toFixed(2)}%`.padStart(8);
        console.log(
          `${k.date} ${k.open.toFixed(2).padStart(7)} ${k.high.toFixed(2).padStart(7)} ` +
            `${k.low.toFixed(2).padStart(7)} ${k.close.toFixed(2).padStart(7)} ${volumeStr} ${changePctStr}`,
        );
      });
    }

    // 投资建议
    console.log('\n💡 技术分析总结');
    console.log('-'.repeat(80));

    if (analysis.hasVcp) {
      console.log('✅ 该股票呈现VCP(挥发性收缩)形态');

      if (analysis.summary.contractionCount >= 3) {
        console.log(`✅ 已完成${analysis.summary.contractionCount}次收缩，形态较为完整`);
      }

      if (analysis.summary.volumeDryingUp) {
        console.log('✅ 成交量呈现枯竭状态，符合VCP特征');
      }

      if (analysis.summary.inPullback) {
        console.log('⚠️  当前处于回调阶段');
        const lastPullback = analysis.pullbacks[analysis.pullbacks.length - 1];
        if (lastPullback) {
          if (lastPullback.pullbackPct < 10) {
            console.log('   💡 回调幅度较小，可能是良好的买入时机');
          } else if (lastPullback.pullbackPct < 20) {
            console.log('   💡 回调幅度适中，建议等待企稳信号');
          } else {
            console.log('   ⚠️  回调幅度较大，建议谨慎观察');
          }
        }
      } else {
        console.log('✅ 当前未处于回调中，可能正在突破或横盘');
      }

      if (analysis.summary.distFrom52WeekHigh < -15) {
        console.log('⚠️  距离52周高点较远，需确认上升趋势是否延续');
      } else if (analysis.summary.distFrom52WeekHigh < -5) {
        console.log('💡 距离52周高点不远，处于相对高位区域');
      }

      if (analysis.summary.rsRating > 80) {
        console.log('✅ RS评分较高，相对强势明显');
      } else if (analysis.summary.rsRating > 60) {
        console.log('💡 RS评分中等，有一定相对强度');
      }
    } else {
      console.log('❌ 该股票目前未形成明显的VCP形态');
      console.log('   建议继续观察，等待更清晰的形态出现');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  风险提示: 技术分析仅供参考，投资有风险，入市需谨慎！\n');
  } catch (error: any) {
    console.error('❌ 分析失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await app.close();
  }
}

// 运行分析
analyzeBYD().catch(console.error);
