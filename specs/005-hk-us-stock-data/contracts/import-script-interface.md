# 导入脚本接口契约

**功能**: 005-hk-us-stock-data  
**版本**: 1.0.0  
**日期**: 2026-03-12

## 概述

本文档定义港股和美股数据导入脚本的命令行接口、输出格式和行为规范。

## 命令行接口

### import-hk-stocks.ts (港股导入脚本)

**用途**: 导入恒生指数和恒生科技指数成分股的基本信息和10年历史K线数据

**执行命令**:
```bash
cd backend
ts-node src/scripts/import-hk-stocks.ts [options]
```

**选项**:
```
--index <name>      指定要导入的指数 (默认: "all")
                    值: "hsi" | "hstech" | "all"
                    
--years <number>    指定历史数据年限 (默认: 10)
                    范围: 1-20
                    
--resume            从上次中断处恢复导入 (默认: false)
                    
--force             强制重新导入已存在的股票 (默认: false)
                    
--concurrency <n>   并发请求数量 (默认: 3)
                    范围: 1-5
                    
--verbose           输出详细日志 (默认: false)

--dry-run           模拟运行，不实际写入数据库 (默认: false)
```

**示例**:
```bash
# 导入所有港股核心股票（10年数据）
ts-node src/scripts/import-hk-stocks.ts

# 只导入恒生指数成分股（5年数据）
ts-node src/scripts/import-hk-stocks.ts --index hsi --years 5

# 从中断处恢复导入
ts-node src/scripts/import-hk-stocks.ts --resume

# 强制重新导入所有数据（覆盖现有）
ts-node src/scripts/import-hk-stocks.ts --force --concurrency 2
```

### import-us-stocks.ts (美股导入脚本)

**用途**: 导入标普500和纳斯达克100成分股的基本信息和10年历史K线数据

**执行命令**:
```bash
cd backend
ts-node src/scripts/import-us-stocks.ts [options]
```

**选项**:
```
--index <name>      指定要导入的指数 (默认: "all")
                    值: "sp500" | "ndx100" | "all"
                    
--years <number>    指定历史数据年限 (默认: 10)
                    
--resume            从上次中断处恢复导入
                    
--force             强制重新导入已存在的股票
                    
--concurrency <n>   并发请求数量 (默认: 3)
                    
--verbose           输出详细日志

--dry-run           模拟运行，不实际写入数据库
```

**示例**:
```bash
# 导入所有美股核心股票（10年数据）
ts-node src/scripts/import-us-stocks.ts

# 只导入标普500成分股
ts-node src/scripts/import-us-stocks.ts --index sp500

# 导入3年数据，使用更高并发
ts-node src/scripts/import-us-stocks.ts --years 3 --concurrency 5
```

### update-index-composition.ts (更新指数成分股)

**用途**: 手动触发重新获取指数成分股列表，添加新成员

**执行命令**:
```bash
cd backend
ts-node src/scripts/update-index-composition.ts [options]
```

**选项**:
```
--market <name>     指定市场 (必需)
                    值: "hk" | "us" | "all"
                    
--index <name>      指定指数 (可选)
                    HK: "hsi" | "hstech" | "all"
                    US: "sp500" | "ndx100" | "all"
                    
--import-new        自动导入新增的成分股数据 (默认: false)
                    
--verbose           输出详细日志
```

**示例**:
```bash
# 更新港股所有指数成分股列表
ts-node src/scripts/update-index-composition.ts --market hk

# 更新美股标普500，并自动导入新股票
ts-node src/scripts/update-index-composition.ts --market us --index sp500 --import-new
```

## 输出格式

### 标准输出格式

所有导入脚本必须使用统一的输出格式：

```
🌍 导入港股核心股票数据
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 导入配置:
  • 指数: 恒生指数 + 恒生科技指数
  • 历史数据: 10年 (2016-01-01 至 2026-03-12)
  • 并发数: 3
  • 数据源: AkShare (主) → Yahoo Finance (备)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 第1步: 获取指数成分股列表

✅ 恒生指数: 80只
✅ 恒生科技指数: 30只
✅ 去重后总计: 110只

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 第2步: 检查已导入股票

✅ 已导入: 0只
⏭️  待导入: 110只

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 第3步: 导入股票数据

[进度条示例]
00700.HK | 腾讯控股       | ✅ AkShare    | 2,487条 | 2.3s
09988.HK | 阿里巴巴-SW    | ⚠️ Yahoo      | 2,502条 | 4.1s (AkShare超时)
01024.HK | 快手-W         | ✅ AkShare    | 1,856条 | 2.1s
00388.HK | 香港交易所     | ❌ 失败       | 0条     | 8.2s (两个源都失败)

⏳ 进度: 4/110 (3.6%) | 已用时: 16.7s | 预计剩余: 7.2分钟

[... 继续显示其他股票 ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 导入统计

✅ 成功: 107只
  • AkShare: 85只
  • Yahoo Finance: 22只

❌ 失败: 3只
  • 00388.HK - 两个数据源都超时
  • 02333.HK - 股票代码无效
  • 09999.HK - 数据解析错误

⏭️  跳过: 0只

⏱️  总耗时: 45分钟32秒
💾 数据库新增: 267,750条K线记录

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 失败详情已保存到: ./logs/import-hk-stocks-2026-03-12.log

🎉 港股数据导入完成！

提示: 
  • 查看失败股票详情: cat ./logs/import-hk-stocks-2026-03-12.log
  • 重试失败的股票: ts-node src/scripts/import-hk-stocks.ts --resume
  • 查看导入的数据: npm run prisma:studio
```

### JSON输出模式

使用`--json`标志输出机器可读的JSON格式：

```bash
ts-node src/scripts/import-hk-stocks.ts --json
```

**输出格式**:
```json
{
  "status": "completed",
  "summary": {
    "totalStocks": 110,
    "successCount": 107,
    "failedCount": 3,
    "skippedCount": 0,
    "duration": 2732000,
    "klineRecordsAdded": 267750
  },
  "dataSources": {
    "akshare": 85,
    "yahoo_finance": 22
  },
  "failed": [
    {
      "stockCode": "00388.HK",
      "stockName": "香港交易所",
      "error": "Network timeout from both sources",
      "attemptedSources": [
        {
          "source": "akshare",
          "errorType": "NETWORK_TIMEOUT",
          "message": "Request timeout after 30s"
        },
        {
          "source": "yahoo_finance",
          "errorType": "NETWORK_TIMEOUT",
          "message": "Request timeout after 30s"
        }
      ]
    }
  ],
  "logFile": "./logs/import-hk-stocks-2026-03-12.log"
}
```

## 退出码

所有导入脚本必须遵循标准退出码：

```typescript
enum ExitCode {
  SUCCESS = 0,              // 全部成功
  PARTIAL_SUCCESS = 1,      // 部分失败但完成
  VALIDATION_ERROR = 2,     // 命令行参数错误
  DATABASE_ERROR = 3,       // 数据库连接或操作失败
  DATA_SOURCE_ERROR = 4,    // 数据源完全不可用
  INTERRUPTED = 130,        // 用户中断(Ctrl+C)
}
```

**使用示例**:
```typescript
async function main() {
  try {
    const result = await importStocks();
    
    if (result.failedCount === 0) {
      process.exit(ExitCode.SUCCESS);
    } else if (result.successCount > 0) {
      process.exit(ExitCode.PARTIAL_SUCCESS);
    } else {
      process.exit(ExitCode.DATA_SOURCE_ERROR);
    }
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error('❌ 数据库错误:', error.message);
      process.exit(ExitCode.DATABASE_ERROR);
    }
    throw error;
  }
}

// 处理Ctrl+C中断
process.on('SIGINT', async () => {
  console.log('\n⚠️  导入已中断，进度已保存');
  await prisma.$disconnect();
  process.exit(ExitCode.INTERRUPTED);
});
```

## 日志文件格式

### 日志文件路径

```
backend/logs/
├── import-hk-stocks-2026-03-12-143052.log
├── import-us-stocks-2026-03-12-150230.log
└── update-index-composition-2026-03-12-160145.log
```

**命名规则**: `{script-name}-{date}-{time}.log`

### 日志内容格式

```
[2026-03-12 14:30:52] INFO: 开始导入港股数据
[2026-03-12 14:30:52] INFO: 配置 - 指数:all, 年限:10, 并发:3
[2026-03-12 14:30:55] INFO: 获取指数成分股列表完成 - 110只
[2026-03-12 14:31:00] SUCCESS: 00700.HK (腾讯控股) - 导入2487条K线 (source: akshare)
[2026-03-12 14:31:04] WARNING: 09988.HK (阿里巴巴-SW) - AkShare超时，切换到Yahoo Finance
[2026-03-12 14:31:08] SUCCESS: 09988.HK (阿里巴巴-SW) - 导入2502条K线 (source: yahoo_finance)
[2026-03-12 14:31:15] ERROR: 00388.HK (香港交易所) - 导入失败
  • AkShare: NETWORK_TIMEOUT - Request timeout after 30s
  • Yahoo Finance: NETWORK_TIMEOUT - Request timeout after 30s
[2026-03-12 15:15:24] INFO: 导入完成 - 成功:107, 失败:3, 耗时:45m32s
```

## 进度持久化

### 断点续传机制

**检查点文件** (可选方案):
```json
// backend/data/checkpoints/import-hk-2026-03-12.json
{
  "taskId": "uuid-1234-5678",
  "market": "HK",
  "startTime": "2026-03-12T14:30:52Z",
  "importedStocks": [
    "00700.HK",
    "09988.HK",
    "01024.HK"
  ],
  "failedStocks": [
    {
      "code": "00388.HK",
      "error": "Network timeout from both sources"
    }
  ],
  "totalStocks": 110,
  "status": "running"
}
```

**基于数据库的检查点** (推荐方案):
```typescript
// 查询已导入的股票
const importedStocks = await prisma.stock.findMany({
  where: { 
    market: 'HK',
    // 确保有K线数据
    klines: {
      some: {
        period: 'daily'
      }
    }
  },
  select: { stockCode: true }
});

// 获取待导入列表
const remainingStocks = allStocks.filter(
  s => !importedStocks.some(i => i.stockCode === s.code)
);
```

## 导入流程规范

### 标准导入流程

```typescript
async function importStocks(options: ImportOptions): Promise<ImportResult> {
  // 1. 验证参数
  validateOptions(options);
  
  // 2. 初始化数据源适配器
  const primaryAdapter = createAdapter(options.primarySource);
  const fallbackAdapter = createAdapter(options.fallbackSource);
  
  // 3. 获取指数成分股列表
  console.log('🔍 第1步: 获取指数成分股列表');
  const constituents = await fetchIndexConstituents(options.index);
  console.log(`✅ 总计: ${constituents.length}只\n`);
  
  // 4. 检查已导入股票（断点续传）
  console.log('🔍 第2步: 检查已导入股票');
  const alreadyImported = await checkImportedStocks(options.market);
  const remaining = constituents.filter(
    c => !alreadyImported.includes(c.code)
  );
  console.log(`✅ 已导入: ${alreadyImported.length}只`);
  console.log(`⏭️  待导入: ${remaining.length}只\n`);
  
  // 5. 批量导入
  console.log('💾 第3步: 导入股票数据\n');
  const results = await importBatch(remaining, {
    primaryAdapter,
    fallbackAdapter,
    concurrency: options.concurrency,
    years: options.years,
  });
  
  // 6. 生成报告
  console.log('\n📊 导入统计\n');
  printSummary(results);
  
  // 7. 保存日志
  await saveImportLog(results);
  
  return results;
}
```

### 单股票导入流程

```typescript
async function importSingleStock(
  constituent: IndexConstituent,
  adapters: { primary: IDataSourceAdapter; fallback: IDataSourceAdapter },
  options: ImportOptions
): Promise<ImportStockResult> {
  const startTime = Date.now();
  let usedSource: string;
  
  try {
    // 1. 尝试主数据源
    const stockInfo = await adapters.primary.fetchStockInfo(
      constituent.code,
      options.market
    );
    
    const klines = await adapters.primary.fetchKlineData(
      constituent.code,
      options.market,
      getStartDate(options.years),
      getTodayDate()
    );
    
    usedSource = adapters.primary.name;
    
  } catch (primaryError) {
    // 2. 主数据源失败，尝试备用数据源
    console.log(`⚠️  ${constituent.code} - ${adapters.primary.name}失败，切换到${adapters.fallback.name}`);
    
    try {
      const stockInfo = await adapters.fallback.fetchStockInfo(
        constituent.code,
        options.market
      );
      
      const klines = await adapters.fallback.fetchKlineData(
        constituent.code,
        options.market,
        getStartDate(options.years),
        getTodayDate()
      );
      
      usedSource = adapters.fallback.name;
      
    } catch (fallbackError) {
      // 3. 两个数据源都失败
      throw new ImportError({
        stockCode: constituent.code,
        errors: [primaryError, fallbackError]
      });
    }
  }
  
  // 4. 保存到数据库
  await saveToDatabase(stockInfo, klines, usedSource);
  
  const duration = Date.now() - startTime;
  
  return {
    success: true,
    stockCode: constituent.code,
    klineCount: klines.length,
    source: usedSource,
    duration
  };
}
```

## 错误处理规范

### 错误消息格式

```typescript
interface ErrorMessage {
  level: 'ERROR' | 'WARNING' | 'INFO';
  stockCode: string;
  message: string;
  details?: {
    source: string;
    errorType: string;
    errorMessage: string;
    timestamp: string;
  }[];
}
```

### 用户友好的错误提示

| 错误类型 | 用户提示 | 建议操作 |
|---------|---------|---------|
| NETWORK_TIMEOUT | 网络超时，部分股票导入失败 | 检查网络连接，稍后使用--resume重试 |
| RATE_LIMIT | API限流，已降低请求速度 | 减少--concurrency参数或稍后重试 |
| INVALID_SYMBOL | 股票代码无效 | 检查指数成分股列表是否正确 |
| DATABASE_ERROR | 数据库写入失败 | 检查数据库连接和磁盘空间 |
| DATA_PARSE_ERROR | 数据格式错误 | 查看详细日志，可能需要更新数据源适配器 |

## 性能指标

### 进度显示

**实时进度**:
- 当前股票: 代码、名称
- 进度: 已完成/总数 (百分比)
- 速度: 股票数/分钟
- 已用时: HH:MM:SS
- 预计剩余: HH:MM:SS

**更新频率**: 每完成一只股票更新一次

### 性能基准

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 单股票导入时间 | <3秒 | 从开始请求到数据库写入完成 |
| 批量导入吞吐量 | >20只/分钟 | (并发3时) |
| 内存占用 | <500MB | 导入过程中的峰值内存 |
| 数据库写入速度 | >1000条/秒 | 批量插入K线数据 |

## 脚本依赖

### 环境要求

```json
{
  "node": ">=20.0.0",
  "python": ">=3.8",
  "sqlite": ">=3.40.0"
}
```

### Python依赖

```
# bridge/requirements.txt
akshare>=1.11.0
yfinance>=0.2.28
pandas>=2.0.0
```

### Node.js依赖

```json
{
  "dependencies": {
    "@prisma/client": "^6.19.2",
    "commander": "^14.0.3",
    "p-limit": "^3.1.0"
  }
}
```

## 测试契约

### 集成测试要求

```typescript
describe('Import Scripts', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.stock.deleteMany({ where: { market: 'HK' } });
  });
  
  it('应该成功导入港股数据（使用mock数据源）', async () => {
    const mockAdapter = new MockDataSourceAdapter();
    const result = await importHKStocks({ adapter: mockAdapter });
    
    expect(result.successCount).toBeGreaterThan(0);
    expect(result.failedCount).toBe(0);
  });
  
  it('应该支持断点续传', async () => {
    // 导入部分数据
    await importPartial();
    
    // 中断并重新开始
    const result = await importHKStocks({ resume: true });
    
    // 验证跳过已导入的股票
    expect(result.skippedCount).toBeGreaterThan(0);
  });
  
  it('应该在数据源失败时自动切换', async () => {
    const primaryFails = new FailingAdapter();
    const fallback = new MockDataSourceAdapter();
    
    const result = await importSingleStock('00700', {
      primary: primaryFails,
      fallback: fallback
    });
    
    expect(result.success).toBe(true);
    expect(result.source).toBe('fallback');
  });
});
```

## 版本控制

**当前版本**: 1.0.0

**变更日志**:
- v1.0.0 (2026-03-12): 初始版本，定义港股和美股导入脚本接口
