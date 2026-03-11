/**
 * 同步指数成分股标记
 * 
 * 通过 AkShare 获取沪深300和中证500的成分股列表，
 * 更新 stocks 表的 index_code 字段。
 * 
 * 使用:
 * npx ts-node src/scripts/sync-index-members.ts
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

const INDEX_CONFIG = [
  { code: '000300', label: 'HS300', name: '沪深300' },
  { code: '000905', label: 'ZZ500', name: '中证500' },
];

function fetchIndexMembers(indexCode: string): Promise<string[]> {
  const bridgeDir = path.join(process.cwd(), '..', 'bridge');
  const pythonPath = path.join(bridgeDir, 'venv', 'bin', 'python');
  const scriptPath = path.join(bridgeDir, 'fetch_index_members.py');

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, [scriptPath], { cwd: bridgeDir });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.stdin.write(JSON.stringify({ index_code: indexCode }));
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
  console.log('======================================');
  console.log('📊 同步指数成分股标记');
  console.log('======================================\n');

  // 先清除所有 index_code 标记
  await prisma.stock.updateMany({
    where: { indexCode: { not: null } },
    data: { indexCode: null },
  });
  console.log('🧹 已清除旧的指数标记\n');

  let totalMarked = 0;

  for (const index of INDEX_CONFIG) {
    console.log(`📥 获取 ${index.name} (${index.code}) 成分股...`);

    try {
      const tsCodes = await fetchIndexMembers(index.code);
      console.log(`   AkShare 返回 ${tsCodes.length} 只成分股`);

      if (tsCodes.length === 0) {
        console.log(`   ⚠️ 未获取到数据，跳过\n`);
        continue;
      }

      const result = await prisma.stock.updateMany({
        where: { stockCode: { in: tsCodes } },
        data: { indexCode: index.label },
      });

      console.log(`   ✅ 标记 ${result.count} 只股票为 ${index.label}`);
      if (tsCodes.length !== result.count) {
        console.log(`   (API ${tsCodes.length} 只, DB匹配 ${result.count} 只)`);
      }
      console.log('');
      totalMarked += result.count;
    } catch (error: any) {
      console.error(`   ❌ 获取失败: ${error.message}\n`);
    }
  }

  // 统计结果
  const stats = await prisma.stock.groupBy({
    by: ['indexCode'],
    _count: { stockCode: true },
    where: { indexCode: { not: null } },
  });

  console.log('======================================');
  console.log('📊 标记结果');
  console.log('======================================\n');

  for (const s of stats) {
    console.log(`  ${s.indexCode}: ${s._count.stockCode} 只`);
  }
  console.log(`  总计: ${totalMarked} 只`);

  const totalStocks = await prisma.stock.count();
  console.log(`\n  数据库总股票: ${totalStocks} 只`);
  console.log(`  增量更新范围: ${totalMarked} 只 (${((totalMarked / totalStocks) * 100).toFixed(1)}%)`);
  console.log(`  预计更新耗时: ~${((totalMarked * 5.8) / 3600).toFixed(1)} 小时\n`);
}

main()
  .catch((error) => {
    console.error('❌ 失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
