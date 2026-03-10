// 简单测试脚本：测试回调检测功能
const axios = require('axios');

async function test() {
  try {
    console.log('获取中国巨石(600176)的VCP详情...\n');
    
    const response = await axios.get('http://localhost:3000/api/v1/vcp/600176/detail');
    const data = response.data;
    
    console.log('='.repeat(60));
    console.log(`股票: ${data.stockName} (${data.stockCode})`);
    console.log(`扫描日期: ${data.scanDate}`);
    console.log('='.repeat(60));
    
    console.log(`\nVCP收缩: ${data.contractionCount} 次`);
    console.log(`最后收缩: ${data.lastContractionPct}%`);
    console.log(`缩量: ${data.volumeDryingUp ? '是' : '否'}`);
    console.log(`RS评级: ${data.rsRating}`);
    
    if (data.pullbacks && data.pullbacks.length > 0) {
      console.log(`\n\n🎯 检测到 ${data.pullbacks.length} 个上涨回调:`);
      console.log('='.repeat(60));
      
      data.pullbacks.forEach((pullback, index) => {
        console.log(`\n回调 #${pullback.index}:`);
        console.log(`  高点: ${pullback.highDate.split('T')[0]} - ¥${pullback.highPrice.toFixed(2)}`);
        console.log(`  低点: ${pullback.lowDate.split('T')[0]} - ¥${pullback.lowPrice.toFixed(2)}`);
        console.log(`  回调幅度: ${pullback.pullbackPct.toFixed(2)}%`);
        console.log(`  持续天数: ${pullback.durationDays} 天`);
        console.log(`  平均成交量: ${(pullback.avgVolume / 10000).toFixed(0)}万 手/天`);
        console.log(`  上涨趋势中: ${pullback.isInUptrend ? '是' : '否'}`);
      });
    } else {
      console.log('\n\n未检测到上涨回调');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('错误:', error.response ? error.response.data : error.message);
  }
}

test();
