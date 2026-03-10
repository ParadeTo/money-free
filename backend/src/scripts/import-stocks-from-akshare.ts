/**
 * 从 AkShare 导入股票列表（应用基本过滤）
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

function fetchStockList(): Promise<Array<{code: string, name: string, market: string}>> {
  const bridgeDir = path.join(process.cwd(), '..', 'bridge');
  const pythonPath = path.join(bridgeDir, 'venv', 'bin', 'python');
  const scriptPath = path.join(bridgeDir, 'fetch_stock_list.py');

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [scriptPath], { cwd: bridgeDir });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.stdin.write(JSON.stringify({}));
    proc.stdin.end();

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.data || []);
        }
      } catch (e) {
        reject(new Error(`Failed to parse output: ${stdout}`));
      }
    });
  });
}

async function main() {
  console.log('📊 从 AkShare 导入股票列表...\n');

  console.log('准入标准:');
  console.log('  - 排除ST、*ST股票');
  console.log('  - 只保留主板、中小板、创业板');
  console.log('  - 排除科创板（688开头）和北交所（8开头）\n');

  console.log('🔍 获取股票列表...');
  const allStocks = await fetchStockList();
  console.log(`✅ 获取 ${allStocks.length} 只股票\n`);

  console.log('🔍 应用过滤条件...');
  
  const filteredStocks = allStocks.filter(s => {
    // 排除ST股票
    if (s.name.includes('ST') || s.name.includes('*ST')) return false;
    
    // 排除科创板（688开头）和北交所（8开头）
    if (s.code.startsWith('688') || s.code.startsWith('8')) return false;
    
    return true;
  });

  console.log(`✅ 通过过滤: ${filteredStocks.length} 只\n`);

  console.log('💾 保存到数据库...\n');

  let stats = { added: 0, updated: 0, skipped: 0 };

  for (let i = 0; i < filteredStocks.length; i++) {
    const s = filteredStocks[i];

    try {
      await prisma.stock.upsert({
        where: { stockCode: s.code },
        update: {
          stockName: s.name,
          market: s.market,
          updatedAt: new Date(),
        },
        create: {
          stockCode: s.code,
          stockName: s.name,
          market: s.market,
          listDate: new Date('2000-01-01'),
          admissionStatus: 'active',
        },
      });

      stats.added++;
    } catch (error) {
      stats.skipped++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`⏳ 已保存: ${i + 1}/${filteredStocks.length}`);
    }
  }

  const totalInDb = await prisma.stock.count();

  console.log('\n📈 统计:');
  console.log(`  ✅ 保存: ${stats.added}`);
  console.log(`  ⏭️  跳过: ${stats.skipped}`);
  console.log(`  📊 数据库总数: ${totalInDb}\n`);

  console.log('🎉 股票列表导入完成！\n');
}

main()
  .catch((error) => {
    console.error('❌ 失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
