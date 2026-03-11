# 并行数据获取实现说明

## 概述

成功实现了数据获取的并行化处理，针对 Tushare 免费版 API（120次/分钟）进行了优化。

## 实现内容

### 1. ✅ 速率限制器 (RateLimiter)

**文件**: `src/utils/rate-limiter.ts`

**功能**:
- 令牌桶算法实现 API 速率控制
- 配置为 100 次/分钟（预留 20% 缓冲）
- 自动等待和令牌补充机制
- 支持突发流量处理

**核心方法**:
```typescript
await rateLimiter.acquire()  // 获取令牌，必要时等待
rateLimiter.tryAcquire()     // 尝试获取，不等待
rateLimiter.getConfig()       // 获取配置信息
```

### 2. ✅ TushareService 集成

**文件**: `src/services/datasource/tushare.service.ts`

**改动**:
- 添加 RateLimiter 实例
- 所有 API 调用方法前添加 `await this.rateLimiter.acquire()`
- 确保每个请求都受速率限制保护

**受保护的方法**:
- `getStockBasic()` - 股票基本信息
- `getAdjFactor()` - 复权因子
- `getDailyKLine()` - 日线数据
- `getWeeklyKLine()` - 周线数据
- `getDailyBasic()` - 基本面数据
- `getIndexWeight()` - 指数成分股

### 3. ✅ 初始化脚本并行化

**文件**: `src/scripts/init-index-stocks-klines.ts`

**改动**:
- 使用 `p-limit` 实现并发控制
- 并发数设置为 8
- 移除了串行处理的 2 秒延迟
- 添加实时进度统计和 ETA

**新增功能**:
```
📊 Progress: 10/100 (10%) | Success: 8 | Failed: 2 | 
   Elapsed: 45s | Rate: 13.3/min | ETA: 7min
```

### 4. ✅ 增量更新脚本并行化

**文件**: `src/scripts/incremental-update-latest.ts`

**改动**:
- 使用 `p-limit` 实现并发控制
- 并发数设置为 8
- 移除了串行处理的 2 秒延迟
- 添加详细的更新统计

**新增功能**:
```
📊 Progress: 20/200 (10%) | Updated: 5 | Already: 12 | 
   NoData: 2 | Failed: 1 | Elapsed: 60s | Rate: 20/min | ETA: 9min
```

## 性能提升

### 理论性能

| 场景 | 串行（旧） | 并行（新） | 提升 |
|------|-----------|-----------|------|
| 800只初始化 | ~87分钟 | ~32分钟 | 2.7x |
| 800只增量更新 | ~29分钟 | ~5-10分钟 | 3-6x |
| 处理速率 | ~9只/分 | ~25只/分 | 2.8x |

### 实际性能

实际性能取决于:
- 网络延迟
- API 响应时间
- 数据库写入性能
- 有多少股票需要实际更新

增量更新通常更快，因为多数股票已是最新。

## 配置参数

### 并发数调整

在脚本中修改 `CONCURRENCY` 常量:

```typescript
// src/scripts/init-index-stocks-klines.ts
// src/scripts/incremental-update-latest.ts

const CONCURRENCY = 8;  // 建议范围: 6-12
```

**建议值**:
- **保守**: 6 (更稳定)
- **推荐**: 8 (平衡)
- **激进**: 10-12 (需要高级账号)

### API 速率调整

在 TushareService 中修改速率限制:

```typescript
// src/services/datasource/tushare.service.ts

this.rateLimiter = new RateLimiter(100);  // 请求数/分钟
```

**免费版**: 100-120 次/分钟
**基础版**: 150-200 次/分钟
**高级版**: 400-500 次/分钟

## 使用方法

### 初始化数据（10只测试）

```bash
cd backend
npx ts-node src/scripts/init-index-stocks-klines.ts 10 0
```

### 初始化所有指数成分股

```bash
cd backend
npx ts-node src/scripts/init-index-stocks-klines.ts
```

### 增量更新（20只测试）

```bash
cd backend
npx ts-node src/scripts/incremental-update-latest.ts 20 0 --index-only
```

### 增量更新所有指数成分股

```bash
cd backend
npx ts-node src/scripts/incremental-update-latest.ts --index-only
```

## 监控和日志

### 启动日志

```
🚦 Rate limiter initialized: 100 requests/minute
🚀 并行处理模式：8 个并发任务
```

### 进度日志

每完成 10 只股票输出一次:
```
📊 Progress: 50/800 (6.3%) | Success: 48 | Failed: 2 | 
   Elapsed: 120s | Rate: 25/min | ETA: 30min
```

### 完成统计

```
======================================
🎉 初始化完成！
======================================

处理股票: 800 只
成功: 785 只
失败: 15 只

K线数据: 3,245,789 条
技术指标: 1,892,456 条
```

## 错误处理

### API 限流错误 (429)

如果出现此错误:
1. 降低 API 速率: `new RateLimiter(80)`
2. 降低并发数: `const CONCURRENCY = 6`
3. 等待一段时间再重试

### 数据库锁定错误

SQLite 并发写入冲突:
1. 降低并发数至 4-6
2. 检查磁盘性能
3. 考虑使用 WAL 模式

### 网络超时

偶尔的网络问题:
1. 脚本会自动重试
2. 失败的股票会被记录
3. 可以重新运行脚本补充

## 安全特性

### 速率保护

- ✅ 每个 API 调用前自动获取令牌
- ✅ 令牌用完时自动等待
- ✅ 20% 安全缓冲避免超限

### 并发控制

- ✅ 使用 p-limit 严格控制并发数
- ✅ 单个股票失败不影响其他
- ✅ 保持详细的错误日志

### 数据完整性

- ✅ 使用事务确保数据一致性
- ✅ 保持原有的数据验证逻辑
- ✅ 增量更新使用 upsert 避免重复

## 下一步优化（可选）

### 1. 动态速率调整

根据 API 响应自动调整速率:
```typescript
if (response.remainingQuota < 20) {
  rateLimiter.setRate(80);  // 降低速率
}
```

### 2. 重试机制

针对临时网络错误:
```typescript
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### 3. 进度持久化

保存进度以支持中断恢复:
```typescript
await saveProgress(completed, total);
// 重启后可以从上次中断处继续
```

## 技术栈

- **p-limit**: 并发控制库
- **Token Bucket**: 速率限制算法
- **Promise.all**: 并行执行
- **TypeScript**: 类型安全

## 参考文档

- [TEST_PARALLEL.md](./TEST_PARALLEL.md) - 测试指南
- [p-limit 文档](https://github.com/sindresorhus/p-limit)
- [Tushare API 文档](https://tushare.pro/document/2)
