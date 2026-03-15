# 增量更新数据指南

## 概述

`incremental-update-all-markets.ts` 是一个统一的增量更新脚本，支持同时更新A股、港股和美股的最新数据。

## 功能特点

- ✅ 自动识别股票市场类型（A股/港股/美股）
- ✅ 使用对应的数据源（Tushare for A股，Yahoo Finance for 港股/美股）
- ✅ 增量插入新数据（不删除旧数据）
- ✅ 自动重新计算技术指标
- ✅ 支持并发控制（A股 8并发，港股/美股 3并发）
- ✅ 支持断点续传
- ✅ 详细的进度报告和统计

## 使用方法

### 1. 更新所有市场

```bash
cd backend
npx ts-node src/scripts/incremental-update-all-markets.ts
```

### 2. 更新指定市场

```bash
# 只更新A股
npx ts-node src/scripts/incremental-update-all-markets.ts --markets A

# 只更新港股和美股
npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK,US

# 只更新港股
npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK
```

### 3. 只更新指数成分股

```bash
npx ts-node src/scripts/incremental-update-all-markets.ts --index-only
```

### 4. 限制更新数量

```bash
# 只更新前100只股票
npx ts-node src/scripts/incremental-update-all-markets.ts --limit 100
```

### 5. 使用便捷脚本

```bash
# 直接运行shell脚本（会自动切换到Node 20）
./update-all-markets.sh

# 带参数运行
./update-all-markets.sh --markets A
./update-all-markets.sh --index-only
```

## 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--markets` | 指定要更新的市场，多个市场用逗号分隔 | `--markets A,HK,US` |
| `--limit` | 限制更新的股票数量 | `--limit 100` |
| `--index-only` | 只更新指数成分股（沪深300+中证500） | `--index-only` |
| `--resume` | 恢复之前未完成的任务 | `--resume <taskId>` |

## 数据源

- **A股 (SH/SZ)**: Tushare (主) + AkShare (备)
- **港股 (HK)**: Yahoo Finance (主) + AkShare (备)
- **美股 (US)**: Yahoo Finance

## 并发控制

为了避免API限流和提高更新效率，脚本使用了不同的并发策略：

- **A股**: 8个并发任务
- **港股/美股**: 3个并发任务

## 更新流程

对于每只股票，脚本会：

1. 查询数据库中的最新数据日期
2. 从最新日期的下一天开始获取新数据
3. 增量插入新的K线数据（使用upsert避免重复）
4. 重新计算技术指标（基于完整历史数据）
5. 更新周线数据（仅A股）

## 输出示例

```
======================================
📊 统一增量更新 - A股/港股/美股
======================================

市场: SH, SZ, HK, US
开始时间: 3/14/2026, 7:48:28 AM

找到 804 只股票需要更新 (总计: 804)

📊 股票分布:
  A股 (SH/SZ): 716 只
  港股 (HK): 40 只
  美股 (US): 48 只

🚀 开始更新A股 (并发: 8)
...

📊 Progress: 360/804 (44.8%) | Updated: 358 | Latest: 0 | NoData: 2 | Failed: 0 
Elapsed: 806s | Rate: 26.8/min | ETA: 17min

======================================
🎉 增量更新完成！
======================================

总计: 804 只股票
成功更新: 748 只
已是最新: 0 只
无新数据: 50 只
失败: 6 只
新增K线: 1,580 条
总耗时: 29.2 分钟

📊 各市场统计:

SH:
  成功更新: 350 只
  已是最新: 0 只
  无新数据: 5 只
  失败: 3 只
  新增K线: 700 条

SZ:
  成功更新: 358 只
  已是最新: 0 只
  无新数据: 5 只
  失败: 2 只
  新增K线: 716 条

HK:
  成功更新: 40 只
  已是最新: 0 只
  无新数据: 0 只
  失败: 0 只
  新增K线: 80 条

US:
  成功更新: 0 只
  已是最新: 0 只
  无新数据: 48 只
  失败: 1 只
  新增K线: 0 条
```

## 注意事项

1. **Node版本**: 后端需要使用 Node.js 20.x（使用`nvm use 20`切换）
2. **API限流**: 如果遇到API限流错误，可以降低并发数或增加请求延迟
3. **数据完整性**: 脚本会自动跳过没有历史数据的股票
4. **时区差异**: 美股数据可能会有1-2天的延迟
5. **市场休市**: 休市日无法获取新数据是正常现象

## 定时任务

建议设置定时任务每天自动更新数据：

```bash
# 添加到crontab（每天晚上10点执行）
0 22 * * * cd /path/to/backend && npx ts-node src/scripts/incremental-update-all-markets.ts >> /var/log/stock-update.log 2>&1
```

## 故障排查

### 问题1: Prisma Client错误

```bash
# 重新生成Prisma Client
cd backend
npx prisma generate
```

### 问题2: API超时

增加超时时间或降低并发数：
- 修改脚本中的 `A_STOCK_CONCURRENCY` 和 `HKUS_CONCURRENCY`

### 问题3: 数据格式错误

确保Yahoo Finance返回的日期格式正确被转换为Date对象。脚本已经处理了这个问题。

## 相关文件

- 主脚本: `backend/src/scripts/incremental-update-all-markets.ts`
- Shell脚本: `backend/update-all-markets.sh`
- A股更新脚本: `backend/src/scripts/incremental-update-latest.ts`
- 港股/美股更新脚本: `backend/src/scripts/incremental-update-hk-us.ts`

## 更新日志

- 2026-03-14: 创建统一增量更新脚本，支持A股、港股、美股
- 2026-03-14: 修复港股/美股日期格式问题
- 2026-03-14: 添加市场统计和详细的进度报告
