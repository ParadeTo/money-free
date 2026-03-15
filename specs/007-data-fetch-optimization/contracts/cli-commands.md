# CLI Commands Contract

**Feature**: 007-data-fetch-optimization
**Date**: 2026-03-15
**Type**: Command-Line Interface

## Overview

本文档定义股票数据更新优化功能的命令行接口契约。所有命令通过 `npx ts-node` 或npm scripts执行,支持丰富的参数选项和标准化的输出格式。

---

## 1. 增量更新命令

### 1.1 统一增量更新 (所有市场)

**命令**:
```bash
npx ts-node src/scripts/incremental-update-all-markets.ts [options]
```

**用途**: 更新所有市场(A股、港股、美股)的最新K线数据

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--markets <list>` | string | 'SH,SZ,HK,US' | 指定市场,逗号分隔。可选: SH, SZ, HK, US, A(代表SH+SZ) |
| `--limit <number>` | number | 无限制 | 限制更新的股票数量,用于测试 |
| `--index-only` | boolean | false | 只更新指数成分股 |
| `--resume <taskId>` | string | null | 恢复指定任务ID的中断任务 |
| `--dry-run` | boolean | false | 干运行模式,只显示计划不实际执行 |
| `--verbose` | boolean | false | 详细日志模式 |

**示例**:
```bash
# 更新所有市场
npx ts-node src/scripts/incremental-update-all-markets.ts

# 只更新A股
npx ts-node src/scripts/incremental-update-all-markets.ts --markets A

# 只更新港股和美股
npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK,US

# 只更新指数成分股
npx ts-node src/scripts/incremental-update-all-markets.ts --index-only

# 限制更新100只股票(测试用)
npx ts-node src/scripts/incremental-update-all-markets.ts --limit 100

# 恢复中断的任务
npx ts-node src/scripts/incremental-update-all-markets.ts --resume update-1234567890-abcd

# 干运行,查看计划
npx ts-node src/scripts/incremental-update-all-markets.ts --dry-run
```

**输出格式**:

```
======================================
📊 统一增量更新 - A股/港股/美股
======================================

市场: SH, SZ, HK, US
限制: 全部
开始时间: 2026-03-15 10:00:00

找到 1300 只股票需要更新

🚀 开始更新A股 (并发: 8)

--- Updating 600519 贵州茅台 ---
📅 Latest data: 2026-03-14
📥 Fetching: 2026-03-15 to 2026-03-15
✅ Fetched 1 records from tushare
💾 Inserted 1 records
🔢 Recalculating indicators...
✅ Successfully updated 600519

📊 Progress: 100/1300 (7.7%) | Updated: 95 | Latest: 3 | NoData: 0 | Failed: 2 | Elapsed: 75s | Rate: 80/min | ETA: 15min

======================================
🎉 增量更新完成!
======================================

总计: 1300 只股票
成功更新: 1250 只
已是最新: 40 只
无新数据: 8 只
失败: 2 只
新增K线: 1,258 条
总耗时: 16.2 分钟

📊 各市场统计:

SH:
  成功更新: 500 只
  已是最新: 20 只
  无新数据: 5 只
  失败: 1 只
  新增K线: 505 条

SZ:
  成功更新: 280 只
  已是最新: 15 只
  无新数据: 2 只
  失败: 1 只
  新增K线: 282 条

HK:
  成功更新: 195 只
  已是最新: 3 只
  无新数据: 1 只
  失败: 0 只
  新增K线: 195 条

US:
  成功更新: 275 只
  已是最新: 2 只
  无新数据: 0 只
  失败: 0 只
  新增K线: 276 条

⚠️ 失败的股票 (2 只):
  [SH] 600000: API timeout after 3 retries
  [SZ] 000001: Data validation failed - invalid high price
```

**退出码**:
- `0`: 全部成功 或 成功率 >= 98%
- `1`: 成功率 < 98% 或 致命错误
- `2`: 参数错误
- `3`: 任务已在运行 (互斥锁)

---

### 1.2 指定股票列表更新

**命令**:
```bash
npx ts-node src/scripts/incremental-update-custom.ts [options]
```

**用途**: 更新指定的股票列表

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--stocks <list>` | string | 必填 | 股票代码列表,逗号分隔 |
| `--file <path>` | string | null | 从文件读取股票代码(每行一个) |
| `--verbose` | boolean | false | 详细日志模式 |

**示例**:
```bash
# 指定股票代码
npx ts-node src/scripts/incremental-update-custom.ts --stocks 600519,000858,0700.HK

# 从文件读取
npx ts-node src/scripts/incremental-update-custom.ts --file stocks.txt
```

---

## 2. 全量导入命令

### 2.1 全量历史数据导入

**命令**:
```bash
npx ts-node src/scripts/full-import-stocks.ts [options]
```

**用途**: 为新股票或缺失数据的股票导入完整历史数据

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--market <market>` | string | 必填 | 市场类型: SH, SZ, HK, US, A(代表SH+SZ) |
| `--stocks <list>` | string | 全部 | 指定股票代码,逗号分隔 |
| `--start-date <date>` | string | '5 years ago' | 开始日期(YYYY-MM-DD) |
| `--end-date <date>` | string | 'today' | 结束日期(YYYY-MM-DD) |
| `--resume <taskId>` | string | null | 恢复中断的导入任务 |
| `--dry-run` | boolean | false | 干运行模式 |
| `--verbose` | boolean | false | 详细日志模式 |

**示例**:
```bash
# 导入港股5年历史数据
npx ts-node src/scripts/full-import-stocks.ts --market HK

# 导入指定股票
npx ts-node src/scripts/full-import-stocks.ts --market US --stocks AAPL,TSLA,MSFT

# 指定日期范围
npx ts-node src/scripts/full-import-stocks.ts --market SH --start-date 2020-01-01 --end-date 2025-12-31

# 恢复中断的任务
npx ts-node src/scripts/full-import-stocks.ts --resume import-1234567890-abcd
```

**输出格式**:

```
======================================
📦 全量历史数据导入
======================================

市场: HK
股票数量: 200
日期范围: 2021-03-15 to 2026-03-15
预计记录数: ~250,000

🚀 开始导入 (并发: 3)

--- Importing 0700.HK 腾讯控股 ---
📥 Fetching 5 years data from yahoo_finance
✅ Fetched 1,250 daily records
💾 Inserted 1,250 records (12.5 batches)
📊 Fetching weekly data...
✅ Fetched 260 weekly records
💾 Inserted 260 weekly records
🔢 Calculating indicators...
✅ Successfully imported 0700.HK

📊 Progress: 50/200 (25.0%) | Succeeded: 48 | Failed: 2 | Elapsed: 600s | Rate: 5/min | ETA: 30min

======================================
🎉 全量导入完成!
======================================

总计: 200 只股票
成功: 195 只
失败: 5 只
新增K线: 247,500 条 (日线) + 51,480 条 (周线)
总耗时: 2.1 小时

⚠️ 失败的股票 (5 只):
  0001.HK: API rate limit exceeded
  0002.HK: Data validation failed
  ...
```

---

## 3. 管理命令

### 3.1 查询任务状态

**命令**:
```bash
npx ts-node src/scripts/query-task-status.ts [options]
```

**用途**: 查询更新任务的状态和进度

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--task-id <id>` | string | null | 指定任务ID |
| `--running` | boolean | false | 只显示正在运行的任务 |
| `--recent <number>` | number | 10 | 显示最近N个任务 |

**示例**:
```bash
# 查询指定任务
npx ts-node src/scripts/query-task-status.ts --task-id update-1234567890-abcd

# 查询正在运行的任务
npx ts-node src/scripts/query-task-status.ts --running

# 查询最近20个任务
npx ts-node src/scripts/query-task-status.ts --recent 20
```

**输出格式**:

```
======================================
📋 任务状态查询
======================================

任务ID: update-1234567890-abcd
状态: running
开始时间: 2026-03-15 10:00:00
已运行: 10分钟

进度:
  总计: 1300 只
  已处理: 800 只 (61.5%)
  成功: 780 只
  失败: 20 只
  
速度: 80 只/分钟
预计完成: 10:16:15 (还需 6 分钟)

市场分布:
  SH: 350/526 (66.5%)
  SZ: 280/274 (102.2%) ✅
  HK: 100/200 (50.0%)
  US: 70/300 (23.3%)
```

---

### 3.2 清理任务锁

**命令**:
```bash
npx ts-node src/scripts/cleanup-task-lock.ts [options]
```

**用途**: 清理异常退出留下的任务锁

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--task-id <id>` | string | null | 指定任务ID |
| `--force` | boolean | false | 强制清理所有running状态的任务 |
| `--timeout <minutes>` | number | 120 | 清理超过N分钟仍在running的任务 |

**示例**:
```bash
# 清理指定任务
npx ts-node src/scripts/cleanup-task-lock.ts --task-id update-1234567890-abcd

# 清理超时任务(运行超过2小时)
npx ts-node src/scripts/cleanup-task-lock.ts --timeout 120

# 强制清理所有running任务
npx ts-node src/scripts/cleanup-task-lock.ts --force
```

---

### 3.3 生成性能报告

**命令**:
```bash
npx ts-node src/scripts/generate-performance-report.ts [options]
```

**用途**: 分析历史任务生成性能报告

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--start-date <date>` | string | '7 days ago' | 开始日期 |
| `--end-date <date>` | string | 'today' | 结束日期 |
| `--output <path>` | string | 'stdout' | 输出文件路径(支持JSON/CSV) |

**示例**:
```bash
# 生成最近7天报告
npx ts-node src/scripts/generate-performance-report.ts

# 指定日期范围
npx ts-node src/scripts/generate-performance-report.ts --start-date 2026-03-01 --end-date 2026-03-15

# 输出到JSON文件
npx ts-node src/scripts/generate-performance-report.ts --output report.json
```

**输出格式**:

```
======================================
📊 性能报告 (2026-03-08 ~ 2026-03-15)
======================================

任务统计:
  总任务数: 7
  成功: 7
  失败: 0
  平均耗时: 16.5 分钟
  
速度趋势:
  平均速度: 78.6 只/分钟
  最快: 85.2 只/分钟 (2026-03-14)
  最慢: 72.1 只/分钟 (2026-03-10)
  
成功率:
  平均: 98.5%
  最高: 99.2% (2026-03-14)
  最低: 97.3% (2026-03-11)
  
API调用统计:
  Tushare成功率: 96.8%
  AkShare成功率: 94.2%
  Yahoo Finance成功率: 91.5%
  
常见错误:
  1. API timeout (32次)
  2. Data validation failed (15次)
  3. Rate limit exceeded (8次)
```

---

## 4. 错误处理契约

### 4.1 标准错误码

| 错误码 | 说明 | 示例 |
|--------|------|------|
| `ERR_TASK_RUNNING` | 任务已在运行 | 另一个更新任务正在运行 |
| `ERR_INVALID_MARKET` | 无效的市场类型 | 市场类型必须是 SH, SZ, HK, US 之一 |
| `ERR_INVALID_DATE` | 无效的日期格式 | 日期格式必须为 YYYY-MM-DD |
| `ERR_API_TIMEOUT` | API调用超时 | Tushare API 超时 (3次重试后) |
| `ERR_API_RATE_LIMIT` | API速率限制 | Yahoo Finance 速率限制,已暂停60秒 |
| `ERR_DATA_VALIDATION` | 数据验证失败 | 股票代码 600519: high价格必须 >= close |
| `ERR_DB_CONNECTION` | 数据库连接失败 | SQLite 连接断开 |
| `ERR_CHECKPOINT_NOT_FOUND` | 检查点不存在 | 未找到任务ID: import-xxx |

### 4.2 错误输出格式

```json
{
  "error": "ERR_TASK_RUNNING",
  "message": "另一个更新任务正在运行 (taskId: update-1234567890-abcd)",
  "details": {
    "runningTaskId": "update-1234567890-abcd",
    "startTime": "2026-03-15T10:00:00Z",
    "progress": "800/1300 (61.5%)"
  },
  "timestamp": "2026-03-15T10:15:30Z"
}
```

---

## 5. 进度输出契约

### 5.1 实时进度格式

每处理10只股票或每10秒输出一次:

```
📊 Progress: {completed}/{total} ({percentage}%) | ✅ {succeeded} | ⏭️ {skipped} | ❌ {failed} | ⏱️ {elapsed}s | 📈 {rate}/min | ⏳ ETA: {remaining}min
```

### 5.2 最终统计格式

```
======================================
🎉 {任务类型}完成!
======================================

总计: {total} 只股票
成功更新: {succeeded} 只
已是最新: {skipped} 只
无新数据: {noData} 只
失败: {failed} 只
新增K线: {newRecords} 条
总耗时: {duration} 分钟

📊 各市场统计:
{按市场分组的详细统计}

⚠️ 失败的股票 ({failedCount} 只):
{失败列表,最多显示20只}
```

---

## 6. 配置文件契约

### 6.1 环境变量

所有命令支持以下环境变量:

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | SQLite数据库路径 | `file:./data/stock.db` |
| `TUSHARE_TOKEN` | Tushare API Token | 必填 |
| `LOG_LEVEL` | 日志级别 | `info` |
| `CONCURRENCY_A_STOCK` | A股并发数 | `8` |
| `CONCURRENCY_HKUS` | 港股/美股并发数 | `3` |
| `BATCH_SIZE` | 批量写入大小 | `100` |
| `MAX_RETRIES` | 最大重试次数 | `3` |

### 6.2 配置文件 (可选)

支持在项目根目录创建 `.stockrc.json`:

```json
{
  "concurrency": {
    "aStock": 8,
    "hkus": 3
  },
  "batchSize": 100,
  "retries": {
    "maxAttempts": 3,
    "backoffMs": [1000, 2000, 4000]
  },
  "dataSources": {
    "primary": {
      "aStock": "tushare",
      "hkus": "yahoo_finance"
    },
    "fallback": {
      "aStock": "akshare",
      "hkus": "akshare"
    }
  },
  "performance": {
    "progressInterval": 10000,
    "checkpointInterval": 10
  }
}
```

---

## 7. 测试命令

### 7.1 性能测试

**命令**:
```bash
npx ts-node tests/integration/perf-test.ts [options]
```

**用途**: 运行性能基准测试

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--stocks <number>` | number | 100 | 测试股票数量 |
| `--iterations <number>` | number | 3 | 重复次数 |
| `--report <path>` | string | 'stdout' | 报告输出路径 |

**示例**:
```bash
# 测试100只股票的更新性能
npx ts-node tests/integration/perf-test.ts --stocks 100

# 重复5次取平均值
npx ts-node tests/integration/perf-test.ts --stocks 100 --iterations 5
```

**输出格式**:

```
======================================
🔬 性能基准测试
======================================

测试配置:
  股票数量: 100
  重复次数: 3
  
测试结果:
  平均耗时: 1.25 分钟
  平均速度: 80 只/分钟
  成功率: 99%
  
批量写入性能:
  平均: 320 条/秒
  最快: 350 条/秒
  最慢: 290 条/秒
  
API调用性能:
  平均响应时间: 1.8 秒
  超时率: 0.5%
  
内存使用:
  峰值: 280 MB
  平均: 220 MB
  
✅ 所有性能目标达成
```

---

## 总结

本CLI契约定义了:

1. **4个主要命令**: 增量更新、全量导入、状态查询、性能报告
2. **3个管理命令**: 查询状态、清理锁、生成报告
3. **标准化输出**: 进度格式、统计格式、错误格式
4. **配置支持**: 环境变量、配置文件
5. **错误处理**: 标准错误码、详细错误信息
6. **退出码**: 成功/失败/参数错误/互斥锁

所有命令遵循Unix哲学:
- 做一件事并做好
- 使用文本流作为通用接口
- 支持管道和组合
- 提供清晰的退出码

下一步将在 `quickstart.md` 中提供快速开始指南。
