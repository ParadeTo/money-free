---
name: Parallel Data Fetching
overview: 改造数据获取脚本实现并发控制的并行处理，针对免费版 Tushare API（120次/分钟）优化，预计将 800 只股票的处理时间从 87 分钟缩短至 15-20 分钟。
todos:
  - id: install-deps
    content: 安装 p-limit 包用于并发控制
    status: completed
  - id: create-rate-limiter
    content: 创建 RateLimiter 类实现 API 速率控制
    status: completed
  - id: update-tushare-service
    content: 在 TushareService 中集成 RateLimiter
    status: completed
  - id: parallel-init-script
    content: 改造 init-index-stocks-klines.ts 使用并行处理
    status: completed
  - id: parallel-update-script
    content: 改造 incremental-update-latest.ts 使用并行处理
    status: completed
  - id: test-parallel
    content: 测试并行处理（小批量 10-20 只股票）
    status: completed
isProject: false
---

# 数据获取并行化改造方案

## 当前问题

所有数据获取脚本都是完全串行的：

```295:310:backend/src/scripts/init-index-stocks-klines.ts
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    console.log(`\n[${i + 1}/${stocks.length}] Progress: ${((i / stocks.length) * 100).toFixed(1)}%`);

    const result = await processStock(stock, dataSourceManager, indicatorsService, startDateStr, endDateStr);

    if (result.success) {
      stats.success++;
    } else {
      stats.failed++;
    }

    // API 限流
    if (i < stocks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
```

- 800 只股票逐个处理，每只约 6.5 秒
- 总耗时约 87 分钟

## 优化方案

### 1. API 速率限制器

创建 [backend/src/utils/rate-limiter.ts](backend/src/utils/rate-limiter.ts) 实现令牌桶算法：

- Tushare 免费版：120 次/分钟 = 2 次/秒
- 每只股票需要 3-4 个 API 调用（日线、复权因子、周线）
- 保守设置：100 次/分钟，留 20 次缓冲

### 2. 并发控制

使用 `p-limit` 包控制并发数：

- **并发数**：8 个股票同时处理
- **计算**：100 次/分钟 ÷ 4 次/股票 = 25 只/分钟，8 并发可确保不超限
- **预期**：800 只 ÷ 25 只/分钟 ≈ 32 分钟（实际约 15-20 分钟，因为增量更新多数股票已是最新）

### 3. 改造脚本

修改以下文件使用并行处理：

- [backend/src/scripts/init-index-stocks-klines.ts](backend/src/scripts/init-index-stocks-klines.ts)
- [backend/src/scripts/incremental-update-latest.ts](backend/src/scripts/incremental-update-latest.ts)

使用 `Promise.all()` + `p-limit` 替换 `for` 循环：

```typescript
// 串行（旧）
for (const stock of stocks) {
  await processStock(stock);
  await sleep(2000);
}

// 并行（新）
const limit = pLimit(8);
const tasks = stocks.map(stock => 
  limit(() => processStock(stock))
);
await Promise.all(tasks);
```

### 4. 数据库并发优化

- SQLite 支持多读单写，写入会自动排队
- Prisma 默认连接池大小足够（不需要调整）
- 保持现有的事务处理逻辑

## 实现细节

### RateLimiter 功能

- 令牌桶算法
- 可配置速率（默认 100 次/分钟）
- 自动等待直到有可用令牌
- 支持突发流量

### 错误处理

- 单个股票失败不影响其他
- API 429 错误自动重试（指数退避）
- 保持详细的进度日志

### 进度监控

- 实时显示并发进度
- 每完成 50 只股票输出统计
- 显示预计剩余时间

## 性能提升


| 指标         | 串行（当前） | 并行（优化后）  | 提升   |
| ---------- | ------ | -------- | ---- |
| 初始化 800 只  | ~87 分钟 | ~32 分钟   | 2.7x |
| 增量更新 800 只 | ~29 分钟 | ~5-10 分钟 | 3-6x |
| 并发数        | 1      | 8        | 8x   |


## 风险控制

- API 速率设置为 100/分钟（预留 20% 缓冲）
- 并发数保守设置为 8（可根据实际效果调整到 10-12）
- 保留 API 调用失败的降级机制（Tushare → AkShare）
- 不影响数据准确性和完整性

