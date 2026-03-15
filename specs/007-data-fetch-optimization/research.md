# Phase 0: Research & Technical Decisions

**Feature**: 股票数据更新效率优化
**Date**: 2026-03-15
**Status**: Completed

## Overview

本文档记录了优化股票数据更新功能的技术研究和决策过程。研究重点包括:并发控制策略、批量数据库操作最佳实践、断点续传机制设计、API降级与重试策略、时区处理方案。

---

## 1. 并发控制策略

### 决策: 使用 p-limit 实现分市场并发控制

**选择**: 
- A股: 8个并发连接
- 港股/美股: 3个并发连接 (避免Yahoo Finance API限流)
- 使用 `p-limit` npm包管理并发队列

**理由**:
1. **API速率限制**: Tushare支持较高并发(200次/分钟), Yahoo Finance限制更严格(2000次/小时)
2. **网络稳定性**: A股数据源(Tushare/AkShare)在国内访问稳定,可承受更高并发
3. **资源平衡**: 总并发数11不会超过数据库连接池上限(20),保留资源给其他操作
4. **经验数据**: 现有代码已使用类似并发数,实践证明有效

**考虑的替代方案**:
- **方案A**: 统一并发数(如5个) → 拒绝原因: 无法充分利用A股数据源的高可用性
- **方案B**: 动态调整并发数 → 拒绝原因: 增加复杂度,收益不明显,当前固定值已能满足需求
- **方案C**: 使用worker_threads → 拒绝原因: 过度设计,I/O密集型任务不需要多线程

**实现要点**:
```typescript
import pLimit from 'p-limit';

const A_STOCK_CONCURRENCY = 8;
const HKUS_CONCURRENCY = 3;

const aStockLimit = pLimit(A_STOCK_CONCURRENCY);
const hkusLimit = pLimit(HKUS_CONCURRENCY);

// 按市场类型分组后分别应用限制
```

**参考资源**:
- [p-limit文档](https://github.com/sindresorhus/p-limit)
- Node.js并发模式最佳实践

---

## 2. 批量数据库操作优化

### 决策: 使用Prisma批量操作 + 事务控制

**选择**:
- 批次大小: 50-100条记录/批次
- 使用 `prisma.$transaction()` 保证批次原子性
- 使用 `prisma.kLineData.createMany()` 代替逐条insert
- 数据库连接池: 最小5个,最大20个连接

**理由**:
1. **性能提升**: 批量插入比逐条插入快3-5倍 (减少网络往返和SQL解析开销)
2. **事务一致性**: 批次失败时自动回滚,不会产生部分数据
3. **连接池管理**: 避免频繁创建/销毁连接,复用连接减少开销
4. **SQLite特性**: WAL模式支持读写并发,连接池可充分利用

**批次大小选择**:
- **太小(10-20条)**: 事务开销占比高,性能提升有限
- **太大(500-1000条)**: 单个事务时间长,内存占用高,失败重试代价大
- **50-100条**: 平衡点,既能获得批量操作收益,又不会因单批失败损失过多

**考虑的替代方案**:
- **方案A**: 使用raw SQL + BULK INSERT → 拒绝原因: 绕过Prisma类型安全,难以维护
- **方案B**: 不使用事务 → 拒绝原因: 批次失败会留下脏数据
- **方案C**: 更大的批次(500+) → 拒绝原因: 内存占用高,失败恢复代价大

**实现要点**:
```typescript
const BATCH_SIZE = 100;
const batches = chunk(records, BATCH_SIZE);

for (const batch of batches) {
  await prisma.$transaction(async (tx) => {
    await tx.kLineData.createMany({
      data: batch,
      skipDuplicates: true, // 避免主键冲突
    });
  });
}
```

**参考资源**:
- [Prisma批量操作文档](https://www.prisma.io/docs/concepts/components/prisma-client/crud#create-multiple-records)
- [SQLite性能优化指南](https://www.sqlite.org/performance.html)
- [数据库连接池最佳实践](https://github.com/prisma/prisma/discussions/10474)

---

## 3. 断点续传机制设计

### 决策: 基于ImportCheckpoint表 + 任务状态机

**选择**:
- 使用现有 `ImportCheckpoint` 表记录进度
- 任务状态: `running` → `completed` / `failed` / `paused`
- 每完成一只股票后更新 `importedStocks` 计数器
- 恢复时从 `importedStocks` 位置继续处理下一只

**理由**:
1. **表已存在**: 现有schema已定义ImportCheckpoint,无需新增表
2. **简单可靠**: 计数器方式易于实现和理解,失败重试逻辑清晰
3. **低开销**: 每只股票更新一次,不会成为性能瓶颈
4. **支持查询**: 可以实时查询任务进度

**状态转换**:
```
running → completed  (正常完成)
running → failed     (不可恢复错误)
running → paused     (用户中断或可恢复错误)
paused → running     (手动恢复)
```

**考虑的替代方案**:
- **方案A**: 记录已完成股票代码列表 → 拒绝原因: 数据量大时JSON字段膨胀
- **方案B**: 不使用断点,失败后从头开始 → 拒绝原因: 浪费已完成工作,不符合需求
- **方案C**: 使用Redis等外部存储 → 拒绝原因: 引入新依赖,增加复杂度

**实现要点**:
```typescript
// 启动任务时创建检查点
const checkpoint = await prisma.importCheckpoint.create({
  data: {
    taskId: generateTaskId(),
    market: 'ALL',
    importType: 'incremental',
    totalStocks: stocks.length,
    importedStocks: 0,
    status: 'running',
    startTime: new Date(),
    lastUpdateTime: new Date(),
  },
});

// 每只股票完成后更新
await prisma.importCheckpoint.update({
  where: { taskId: checkpoint.taskId },
  data: {
    importedStocks: { increment: 1 },
    lastUpdateTime: new Date(),
  },
});

// 恢复时查询检查点
const checkpoint = await prisma.importCheckpoint.findFirst({
  where: { status: 'paused' },
  orderBy: { startTime: 'desc' },
});
const resumeIndex = checkpoint?.importedStocks || 0;
```

**参考资源**:
- 现有 `ImportCheckpoint` schema定义
- [断点续传设计模式](https://martinfowler.com/articles/patterns-of-distributed-systems/checkpoint.html)

---

## 4. API降级与重试策略

### 决策: 指数退避 + 主备数据源切换

**选择**:
- 重试策略: 指数退避,最多3次重试
- 退避时间: 1s → 2s → 4s
- 主备切换: Tushare失败 → AkShare, Yahoo Finance失败 → AkShare
- 速率限制检测: 捕获HTTP 429状态码,自动暂停60秒

**理由**:
1. **指数退避**: 防止短时间内频繁重试加重API压力
2. **主备切换**: 不同数据源故障独立,提高整体可用性
3. **速率限制处理**: 尊重API限制,避免被永久封禁
4. **有限重试**: 3次足够覆盖临时网络抖动,避免死循环

**错误分类**:
| 错误类型 | 处理策略 | 示例 |
|---------|---------|-----|
| 临时网络错误 | 重试3次 | ETIMEDOUT, ECONNRESET |
| 速率限制 | 暂停60秒 | HTTP 429 |
| 数据源不可用 | 切换备用源 | HTTP 503, DNS错误 |
| 数据格式错误 | 跳过不重试 | JSON解析失败 |
| 认证错误 | 立即失败 | HTTP 401, 403 |

**考虑的替代方案**:
- **方案A**: 固定时间重试(如每次等待5秒) → 拒绝原因: 不能适应不同类型的临时故障
- **方案B**: 无限重试 → 拒绝原因: 永久性错误会导致任务卡死
- **方案C**: 不切换数据源 → 拒绝原因: 无法应对主数据源故障

**实现要点**:
```typescript
async function fetchWithRetry(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await primaryFn();
    } catch (error) {
      if (isRateLimitError(error)) {
        await sleep(60000); // 暂停60秒
        continue;
      }
      
      if (isRetryableError(error) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await sleep(backoffMs);
        continue;
      }
      
      // 尝试备用数据源
      if (attempt === maxRetries && fallbackFn) {
        return await fallbackFn();
      }
      
      lastError = error;
    }
  }
  
  throw lastError;
}
```

**参考资源**:
- [指数退避算法](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Google API重试最佳实践](https://cloud.google.com/apis/design/errors#error_retries)
- [AWS SDK重试策略](https://docs.aws.amazon.com/general/latest/gr/api-retries.html)

---

## 5. 时区处理方案

### 决策: UTC统一存储 + 市场类型映射转换

**选择**:
- 所有日期字段统一存储为UTC时间
- 市场时区映射:
  - A股(SH/SZ): UTC+8
  - 港股(HK): UTC+8
  - 美股(US): UTC-5 (冬令时) / UTC-4 (夏令时)
- 使用 `date-fns` 或 `date-fns-tz` 进行时区转换
- 在数据获取和比较时根据市场类型转换

**理由**:
1. **数据一致性**: UTC存储消除歧义,跨市场比较准确
2. **标准做法**: 数据库时区处理的最佳实践
3. **简化查询**: 日期范围查询不需要考虑时区偏移
4. **未来扩展**: 增加新市场时只需添加时区映射

**转换时机**:
- **存储时**: API返回的本地时间 → UTC → 数据库
- **查询时**: UTC → 市场本地时间 → 显示/比较
- **比较时**: 确保两个时间都在同一时区(UTC)

**考虑的替代方案**:
- **方案A**: 存储本地时间+时区字段 → 拒绝原因: 增加字段,查询复杂
- **方案B**: 统一使用服务器本地时区 → 拒绝原因: 跨时区数据比较不准确
- **方案C**: 每个市场单独存储 → 拒绝原因: 分散数据,难以统一查询

**实现要点**:
```typescript
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const MARKET_TIMEZONES = {
  SH: 'Asia/Shanghai',     // UTC+8
  SZ: 'Asia/Shanghai',     // UTC+8
  HK: 'Asia/Hong_Kong',    // UTC+8
  US: 'America/New_York',  // UTC-5/-4 (自动处理夏令时)
};

// API返回本地时间 → UTC存储
function toUTC(localDate: Date, market: string): Date {
  const timezone = MARKET_TIMEZONES[market];
  return zonedTimeToUtc(localDate, timezone);
}

// UTC → 市场本地时间(用于显示/比较)
function toMarketTime(utcDate: Date, market: string): Date {
  const timezone = MARKET_TIMEZONES[market];
  return utcToZonedTime(utcDate, timezone);
}
```

**参考资源**:
- [date-fns时区处理文档](https://date-fns.org/docs/Time-Zones)
- [IANA时区数据库](https://www.iana.org/time-zones)
- [数据库时区最佳实践](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_timestamp_.28without_time_zone.29)

---

## 6. 增量指标计算优化

### 决策: 基于滑动窗口的增量计算

**选择**:
- 只重新计算受影响日期之后的指标
- 缓存滑动窗口内的历史数据(如MA200需要200天数据)
- 对于新增N天数据,只计算最后N天的指标
- 保留完整历史数据查询能力,必要时回退到全量计算

**理由**:
1. **性能提升**: 避免每次都重新计算全部历史指标,节省50%以上时间
2. **准确性**: 技术指标依赖历史窗口数据,滑动窗口保证结果正确性
3. **简化实现**: 复用现有TechnicalIndicatorsService,只改变输入数据范围
4. **可回退**: 如果增量计算出错,可回退到全量重算

**窗口大小**:
- MA50/MA150/MA200: 需要过去200天数据
- KDJ(9,3): 需要过去约30天数据
- RSI(14): 需要过去约30天数据
- 成交量均线(52周): 需要约一年数据

**考虑的替代方案**:
- **方案A**: 始终删除并重算全部指标 → 拒绝原因: 性能差,不符合优化目标
- **方案B**: 只计算新增日期指标 → 拒绝原因: 滑动窗口变化会影响最近N天的指标值
- **方案C**: 实现复杂的增量更新算法 → 拒绝原因: 过度设计,当前方案已足够

**实现要点**:
```typescript
// 获取窗口起始日期 (新数据最早日期 - 最大窗口大小)
const windowStart = subDays(newDataStartDate, MAX_WINDOW_SIZE); // 200天

// 获取窗口内历史数据
const windowData = await prisma.kLineData.findMany({
  where: {
    stockCode,
    period: 'daily',
    date: { gte: windowStart },
  },
  orderBy: { date: 'asc' },
});

// 使用窗口数据计算指标
const indicators = calculateIndicators(windowData);

// 只保存新增日期之后的指标
const newIndicators = indicators.filter(
  item => item.date >= newDataStartDate
);

// 删除旧指标,插入新指标
await prisma.$transaction([
  prisma.technicalIndicator.deleteMany({
    where: {
      stockCode,
      date: { gte: newDataStartDate },
    },
  }),
  prisma.technicalIndicator.createMany({
    data: newIndicators,
  }),
]);
```

**参考资源**:
- 现有 `TechnicalIndicatorsService` 实现
- [技术指标计算原理](https://school.stockcharts.com/doku.php?id=technical_indicators)
- [滑动窗口算法](https://en.wikipedia.org/wiki/Sliding_window_protocol)

---

## 7. 任务互斥锁机制

### 决策: 基于UpdateLog表的简单锁

**选择**:
- 启动任务时创建status='running'的UpdateLog记录
- 其他任务启动前检查是否存在running状态的任务
- 如存在则立即拒绝并返回错误
- 任务完成/失败时更新status为'completed'/'failed'

**理由**:
1. **简单可靠**: 利用数据库事务保证原子性
2. **无需新表**: 复用现有UpdateLog表
3. **易于查询**: 管理员可直接查看running任务
4. **避免死锁**: 不使用复杂的分布式锁

**边界情况处理**:
- 进程崩溃未更新状态: 提供手动清理命令
- 长时间running: 记录startTime,可设置超时自动清理
- 并发启动: 数据库unique约束或事务保证只有一个成功

**考虑的替代方案**:
- **方案A**: 使用Redis分布式锁 → 拒绝原因: 引入新依赖,单机场景不需要
- **方案B**: 使用文件锁 → 拒绝原因: 跨平台兼容性问题,难以清理
- **方案C**: 不加锁,允许并发 → 拒绝原因: 会导致数据竞争和资源争用

**实现要点**:
```typescript
// 检查是否有running任务
const runningTask = await prisma.updateLog.findFirst({
  where: { status: 'running' },
});

if (runningTask) {
  throw new Error(
    `另一个更新任务正在运行 (taskId: ${runningTask.taskId})`
  );
}

// 创建新任务记录(原子操作)
const taskId = generateTaskId();
await prisma.updateLog.create({
  data: {
    taskId,
    status: 'running',
    totalStocks: stocks.length,
    startTime: new Date(),
  },
});

try {
  // 执行更新逻辑
  // ...
  
  // 成功完成
  await prisma.updateLog.update({
    where: { taskId },
    data: { status: 'completed', endTime: new Date() },
  });
} catch (error) {
  // 失败
  await prisma.updateLog.update({
    where: { taskId },
    data: { status: 'failed', endTime: new Date() },
  });
  throw error;
}
```

**参考资源**:
- [数据库锁机制](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [分布式锁的权衡](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)

---

## 8. 现有脚本整合策略

### 决策: 统一入口 + 废弃冗余脚本

**当前脚本分析**:

**更新类脚本** (5个):
- `incremental-update-all-markets.ts` - 统一更新所有市场 ✅ 保留
- `incremental-update-hk-us.ts` - 港股美股增量更新 ❌ 废弃
- `incremental-update-latest.ts` - 增量更新最新数据 ❌ 废弃
- `batch-incremental-update-latest.ts` - 批量增量更新 ❌ 废弃
- `update-index-composition.ts` - 更新指数成分 ✅ 保留(独立功能)

**导入类脚本** (7个):
- `import-stocks-from-akshare.ts` - 从AkShare导入 ✅ 重构后保留
- `import-hk-stocks.ts` - 导入港股 ❌ 合并到统一脚本
- `import-us-stocks.ts` - 导入美股 ❌ 合并到统一脚本
- `test-import-hk.ts` - 测试港股导入 ❌ 移到tests目录
- `test-import-us.ts` - 测试美股导入 ❌ 移到tests目录
- `quick-import-sample.ts` - 快速导入样本 ❌ 移到tests目录
- `verify-import.ts` - 验证导入 ✅ 保留(验证工具)

**选择: 统一入口模式**

**保留的脚本** (3个核心 + 2个工具):
1. `incremental-update-all-markets.ts` (已优化) - 增量更新统一入口
2. `full-import-stocks.ts` (新建) - 全量导入统一入口
3. `update-index-composition.ts` - 指数成分更新(独立功能)
4. `verify-import.ts` - 导入验证工具
5. `manage-tasks.ts` (新建) - 任务管理工具(查询/清理/报告)

**废弃的脚本** (7个):
- `incremental-update-hk-us.ts` → 功能合并到 `incremental-update-all-markets.ts`
- `incremental-update-latest.ts` → 功能合并到 `incremental-update-all-markets.ts`
- `batch-incremental-update-latest.ts` → 功能合并到 `incremental-update-all-markets.ts`
- `import-hk-stocks.ts` → 功能合并到 `full-import-stocks.ts`
- `import-us-stocks.ts` → 功能合并到 `full-import-stocks.ts`
- `import-stocks-from-akshare.ts` → 功能合并到 `full-import-stocks.ts`

**测试脚本移动** (3个):
- `test-import-hk.ts` → `tests/integration/import-hk.spec.ts`
- `test-import-us.ts` → `tests/integration/import-us.spec.ts`
- `quick-import-sample.ts` → `tests/integration/quick-import.spec.ts`

**理由**:
1. **减少维护负担**: 12个脚本减少到5个核心脚本
2. **统一接口**: 一个增量更新入口,一个全量导入入口
3. **避免混淆**: 用户不需要选择使用哪个脚本
4. **提高质量**: 集中优化核心脚本,而不是分散维护
5. **更好的测试**: 测试脚本移到tests目录,使用标准测试框架

**迁移路径**:

```typescript
// 旧脚本 → 新脚本映射

// 增量更新
incremental-update-hk-us.ts
  → npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK,US

incremental-update-latest.ts [limit] [offset]
  → npx ts-node src/scripts/incremental-update-all-markets.ts --limit [limit]

batch-incremental-update-latest.ts
  → npx ts-node src/scripts/incremental-update-all-markets.ts

// 全量导入
import-hk-stocks.ts
  → npx ts-node src/scripts/full-import-stocks.ts --market HK

import-us-stocks.ts
  → npx ts-node src/scripts/full-import-stocks.ts --market US

import-stocks-from-akshare.ts
  → npx ts-node src/scripts/full-import-stocks.ts --market [SH|SZ] --source akshare
```

**废弃过程**:

1. **Phase 1**: 实现新的统一脚本
2. **Phase 2**: 在旧脚本中添加废弃警告
   ```typescript
   console.warn(`
   ⚠️ 警告: 此脚本已废弃,将在下个版本移除
   请使用新的统一入口:
   npx ts-node src/scripts/incremental-update-all-markets.ts --markets HK,US
   `);
   ```
3. **Phase 3**: 创建迁移指南 `scripts/MIGRATION.md`
4. **Phase 4**: 1个月后删除废弃脚本

**考虑的替代方案**:
- **方案A**: 保留所有脚本,只优化核心脚本 → 拒绝原因: 维护负担高,用户困惑
- **方案B**: 立即删除所有旧脚本 → 拒绝原因: 破坏现有使用者的工作流
- **方案C**: 使用软链接保持兼容性 → 拒绝原因: 复杂度高,不利于清理

**实现要点**:

```typescript
// 新的统一脚本应支持所有旧脚本的功能
// full-import-stocks.ts

interface ImportOptions {
  market: 'SH' | 'SZ' | 'HK' | 'US' | 'A';
  stocks?: string[];  // 指定股票列表
  startDate?: string;
  endDate?: string;
  source?: 'tushare' | 'akshare' | 'yahoo_finance'; // 指定数据源
  resume?: string;    // 恢复任务
  dryRun?: boolean;
}

// 支持所有旧脚本的用例
// import-hk-stocks.ts → --market HK
// import-us-stocks.ts → --market US
// import-stocks-from-akshare.ts → --market SH --source akshare
```

**文档更新**:

创建 `backend/scripts/MIGRATION.md`:

```markdown
# 脚本迁移指南

## 废弃的脚本

以下脚本已废弃,请使用新的统一入口:

### 增量更新

❌ `incremental-update-hk-us.ts`
✅ `incremental-update-all-markets.ts --markets HK,US`

❌ `incremental-update-latest.ts 100`
✅ `incremental-update-all-markets.ts --limit 100`

### 全量导入

❌ `import-hk-stocks.ts`
✅ `full-import-stocks.ts --market HK`

❌ `import-us-stocks.ts`
✅ `full-import-stocks.ts --market US`

完整的命令参数见 specs/007-data-fetch-optimization/contracts/cli-commands.md
```

**参考资源**:
- [Node.js脚本组织最佳实践](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [CLI工具设计原则](https://clig.dev/)

---

## 总结

本次研究确定了8个关键技术决策,全部基于现有技术栈和最佳实践:

1. **并发控制**: p-limit + 分市场并发数
2. **批量操作**: Prisma批量API + 100条/批次
3. **断点续传**: ImportCheckpoint表 + 计数器
4. **API重试**: 指数退避 + 主备切换
5. **时区处理**: UTC存储 + date-fns转换
6. **增量指标**: 滑动窗口 + 复用现有服务
7. **任务互斥**: UpdateLog表 + 简单锁
8. **脚本整合**: 12个脚本整合为5个核心脚本 + 迁移指南

这些决策平衡了性能、复杂度和可维护性,没有引入新的外部依赖,能够与现有代码库良好集成。特别是脚本整合策略将大幅降低维护负担,提供统一的用户体验。下一步将在Phase 1中设计具体的数据模型和接口契约。
