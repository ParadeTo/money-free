# Data Model: 股票数据更新优化

**Feature**: 007-data-fetch-optimization
**Date**: 2026-03-15
**Status**: Phase 1 Design

## Overview

本文档定义股票数据更新优化功能的数据模型。由于需求明确不修改现有数据库schema,本文档主要描述现有表的使用方式、新增的内存数据结构、以及数据流转逻辑。

---

## 1. 现有数据库表 (不修改)

### 1.1 Stock (股票基础信息)

**用途**: 数据更新的目标对象列表

```prisma
model Stock {
  stockCode       String   @id @map("stock_code")
  stockName       String   @map("stock_name")
  market          String   // 'SH' | 'SZ' | 'HK' | 'US'
  currency        String   @default("CNY")
  indexCode       String?  @map("index_code")
  admissionStatus String   @default("active") @map("admission_status")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  // ... 其他字段
}
```

**本功能使用方式**:
- 查询: 根据 `market`, `indexCode`, `admissionStatus` 筛选待更新股票
- 只读: 不修改此表数据
- 索引利用: 使用现有 `market`, `admissionStatus` 索引提高查询效率

**查询示例**:
```typescript
// 查询所有A股
const aStocks = await prisma.stock.findMany({
  where: {
    market: { in: ['SH', 'SZ'] },
    admissionStatus: 'active',
  },
  select: { stockCode: true, stockName: true, market: true },
});

// 查询指数成分股
const indexStocks = await prisma.stock.findMany({
  where: {
    indexCode: { not: null },
    admissionStatus: 'active',
  },
});
```

---

### 1.2 KLineData (K线数据)

**用途**: 需要增量更新的核心数据

```prisma
model KLineData {
  id        Int      @id @default(autoincrement())
  stockCode String   @map("stock_code")
  date      DateTime // UTC时间存储
  period    String   // 'daily' | 'weekly'
  open      Float
  high      Float
  low       Float
  close     Float
  volume    Float
  amount    Float
  source    String   @default("tushare")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@unique([stockCode, date, period])
  @@index([stockCode, period, date])
}
```

**本功能使用方式**:
- 插入: 使用 `createMany()` 批量插入新数据
- 查询: 使用 `stockCode`, `period`, `date` 联合索引查询最新日期和窗口数据
- 更新: 使用 `upsert()` 处理可能的重复数据(skipDuplicates)

**关键操作**:
```typescript
// 1. 查询最新数据日期
const latest = await prisma.kLineData.findFirst({
  where: { stockCode, period: 'daily' },
  orderBy: { date: 'desc' },
  select: { date: true },
});

// 2. 批量插入 (优化重点)
await prisma.$transaction(async (tx) => {
  await tx.kLineData.createMany({
    data: newRecords,
    skipDuplicates: true,
  });
});

// 3. 查询滑动窗口数据 (用于指标计算)
const windowData = await prisma.kLineData.findMany({
  where: {
    stockCode,
    period: 'daily',
    date: { gte: windowStartDate },
  },
  orderBy: { date: 'asc' },
});
```

**数据验证规则**:
- `open`, `high`, `low`, `close`: 必须 > 0
- `high` >= `max(open, close)`, `low` <= `min(open, close)`
- `volume`, `amount`: 必须 >= 0
- `date`: 必须为有效UTC时间

---

### 1.3 TechnicalIndicator (技术指标)

**用途**: 基于K线计算的技术指标,需要增量更新

```prisma
model TechnicalIndicator {
  id            Int      @id @default(autoincrement())
  stockCode     String   @map("stock_code")
  date          DateTime // UTC时间
  period        String   // 'daily' | 'weekly'
  indicatorType String   @map("indicator_type")
  values        String   // JSON: {"ma50": 10.5, ...}
  calculatedAt  DateTime @default(now()) @map("calculated_at")
  
  @@unique([stockCode, date, period, indicatorType])
  @@index([stockCode, period, indicatorType, date])
}
```

**本功能使用方式**:
- 删除: 删除受影响日期之后的旧指标
- 插入: 批量插入新计算的指标
- 查询: 用于验证指标完整性

**指标类型与JSON结构**:
```typescript
type IndicatorValues = {
  // MA均线
  ma: { ma50?: number; ma150?: number; ma200?: number };
  
  // KDJ
  kdj: { k: number; d: number; j: number };
  
  // RSI
  rsi: { rsi: number };
  
  // 成交量
  volume: { volume: number; volumeMA: number };
  
  // 成交额
  amount: { amount: number; amountMA: number };
  
  // 52周标记
  week52_marker: {
    high: number;
    low: number;
    highDate: string;
    lowDate: string;
  };
};
```

**增量更新逻辑**:
```typescript
// 1. 删除受影响日期之后的旧指标
await prisma.technicalIndicator.deleteMany({
  where: {
    stockCode,
    period: 'daily',
    date: { gte: affectedStartDate },
  },
});

// 2. 批量插入新指标
await prisma.technicalIndicator.createMany({
  data: newIndicators,
});
```

---

### 1.4 UpdateLog (更新日志)

**用途**: 记录更新任务执行情况,用于监控和互斥锁

```prisma
model UpdateLog {
  taskId          String   @id @map("task_id")
  status          String   // 'pending' | 'running' | 'completed' | 'failed'
  totalStocks     Int      @map("total_stocks")
  processedStocks Int      @default(0) @map("processed_stocks")
  successCount    Int      @default(0) @map("success_count")
  failedCount     Int      @default(0) @map("failed_count")
  errorDetails    String?  @map("error_details") // JSON数组
  startTime       DateTime @default(now()) @map("start_time")
  endTime         DateTime? @map("end_time")
  
  @@index([startTime])
}
```

**本功能使用方式**:
- 创建: 任务启动时创建 `status='running'` 记录 (互斥锁)
- 更新: 实时更新进度计数器
- 查询: 检查是否有running任务,查询历史任务

**互斥锁实现**:
```typescript
// 1. 检查是否有running任务
const runningTask = await prisma.updateLog.findFirst({
  where: { status: 'running' },
});
if (runningTask) {
  throw new TaskAlreadyRunningError(runningTask.taskId);
}

// 2. 创建新任务
const taskId = `update-${Date.now()}-${randomBytes(4).toString('hex')}`;
await prisma.updateLog.create({
  data: {
    taskId,
    status: 'running',
    totalStocks: stocks.length,
    startTime: new Date(),
  },
});
```

**错误详情JSON格式**:
```typescript
type ErrorDetail = {
  stockCode: string;
  market: string;
  error: string;
  errorType: 'api_error' | 'validation_error' | 'db_error';
  timestamp: string;
  retryResult?: 'success' | 'failed';
};

// 示例
const errorDetails = [
  {
    stockCode: '600519',
    market: 'SH',
    error: 'API timeout after 3 retries',
    errorType: 'api_error',
    timestamp: '2026-03-15T10:30:00Z',
    retryResult: 'failed',
  },
];
```

---

### 1.5 ImportCheckpoint (导入检查点)

**用途**: 记录全量导入进度,支持断点续传

```prisma
model ImportCheckpoint {
  taskId         String    @id @map("task_id")
  market         String    // 'HK' | 'US' | 'SH' | 'SZ' | 'ALL'
  importType     String    @map("import_type") // 'full' | 'incremental'
  totalStocks    Int       @map("total_stocks")
  importedStocks Int       @default(0) @map("imported_stocks")
  failedStocks   String?   @map("failed_stocks") // JSON数组
  status         String    // 'running' | 'completed' | 'failed' | 'paused'
  startTime      DateTime  @map("start_time")
  lastUpdateTime DateTime  @map("last_update_time")
  endTime        DateTime? @map("end_time")
  
  @@index([market, status])
  @@index([startTime])
}
```

**本功能使用方式**:
- 创建: 全量导入启动时创建检查点
- 更新: 每完成一只股票更新 `importedStocks` 计数器
- 恢复: 查询 `status='paused'` 的检查点,从 `importedStocks` 位置继续

**断点续传逻辑**:
```typescript
// 1. 尝试恢复中断的任务
const pausedCheckpoint = await prisma.importCheckpoint.findFirst({
  where: { status: 'paused', market },
  orderBy: { startTime: 'desc' },
});

let startIndex = 0;
let taskId: string;

if (pausedCheckpoint) {
  startIndex = pausedCheckpoint.importedStocks;
  taskId = pausedCheckpoint.taskId;
  
  // 更新状态为running
  await prisma.importCheckpoint.update({
    where: { taskId },
    data: { status: 'running' },
  });
} else {
  // 创建新检查点
  taskId = generateTaskId();
  await prisma.importCheckpoint.create({
    data: {
      taskId,
      market,
      importType: 'full',
      totalStocks: stocks.length,
      status: 'running',
      startTime: new Date(),
      lastUpdateTime: new Date(),
    },
  });
}

// 2. 从startIndex开始处理
const stocksToProcess = stocks.slice(startIndex);
```

**失败股票JSON格式**:
```typescript
type FailedStock = {
  stockCode: string;
  error: string;
  attemptCount: number;
};

// 示例
const failedStocks = [
  {
    stockCode: '0700.HK',
    error: 'API timeout',
    attemptCount: 3,
  },
];
```

---

## 2. 内存数据结构 (运行时)

### 2.1 BatchWriter (批量写入器)

**用途**: 管理批量写入队列

```typescript
class BatchWriter<T> {
  private queue: T[] = [];
  private readonly batchSize: number;
  private readonly flushFn: (batch: T[]) => Promise<void>;
  
  constructor(batchSize: number, flushFn: (batch: T[]) => Promise<void>) {
    this.batchSize = batchSize;
    this.flushFn = flushFn;
  }
  
  async add(item: T): Promise<void> {
    this.queue.push(item);
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }
  
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    await this.flushFn(batch);
  }
}

// 使用示例
const writer = new BatchWriter(100, async (batch) => {
  await prisma.kLineData.createMany({
    data: batch,
    skipDuplicates: true,
  });
});
```

---

### 2.2 ProgressTracker (进度追踪器)

**用途**: 实时追踪和显示更新进度

```typescript
interface ProgressStats {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  startTime: number;
  lastUpdate: number;
}

class ProgressTracker {
  private stats: ProgressStats;
  private updateInterval: NodeJS.Timer | null = null;
  
  constructor(total: number) {
    this.stats = {
      total,
      completed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
  }
  
  startPeriodicUpdate(intervalMs: number = 10000): void {
    this.updateInterval = setInterval(() => {
      this.printProgress();
    }, intervalMs);
  }
  
  increment(result: 'success' | 'failed' | 'skipped'): void {
    this.stats.completed++;
    if (result === 'success') this.stats.succeeded++;
    else if (result === 'failed') this.stats.failed++;
    else if (result === 'skipped') this.stats.skipped++;
    
    this.stats.lastUpdate = Date.now();
    
    // 每10只股票打印一次
    if (this.stats.completed % 10 === 0) {
      this.printProgress();
    }
  }
  
  private printProgress(): void {
    const { total, completed, succeeded, failed, skipped, startTime } = this.stats;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (completed / elapsed) * 60; // 每分钟处理数
    const remaining = Math.ceil((total - completed) / rate);
    const progress = ((completed / total) * 100).toFixed(1);
    
    console.log(
      `📊 Progress: ${completed}/${total} (${progress}%) | ` +
      `✅ ${succeeded} | ⏭️ ${skipped} | ❌ ${failed} | ` +
      `⏱️ ${elapsed.toFixed(0)}s | 📈 ${rate.toFixed(1)}/min | ` +
      `⏳ ETA: ${remaining}min`
    );
  }
  
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.printProgress(); // 最后一次打印
  }
}
```

---

### 2.3 DataSourceCache (数据源可用性缓存)

**用途**: 缓存数据源状态,避免重复尝试不可用的数据源

```typescript
interface DataSourceStatus {
  isAvailable: boolean;
  lastCheckTime: number;
  consecutiveFailures: number;
}

class DataSourceCache {
  private cache: Map<string, DataSourceStatus> = new Map();
  private readonly failureThreshold = 3;
  private readonly cacheExpiry = 5 * 60 * 1000; // 5分钟
  
  markSuccess(source: string): void {
    this.cache.set(source, {
      isAvailable: true,
      lastCheckTime: Date.now(),
      consecutiveFailures: 0,
    });
  }
  
  markFailure(source: string): void {
    const status = this.cache.get(source) || {
      isAvailable: true,
      lastCheckTime: Date.now(),
      consecutiveFailures: 0,
    };
    
    status.consecutiveFailures++;
    status.lastCheckTime = Date.now();
    
    if (status.consecutiveFailures >= this.failureThreshold) {
      status.isAvailable = false;
    }
    
    this.cache.set(source, status);
  }
  
  isAvailable(source: string): boolean {
    const status = this.cache.get(source);
    if (!status) return true; // 未知状态假定可用
    
    // 缓存过期,重新检测
    if (Date.now() - status.lastCheckTime > this.cacheExpiry) {
      return true;
    }
    
    return status.isAvailable;
  }
}
```

---

## 3. 数据流转图

### 3.1 增量更新流程

```
┌─────────────┐
│ 查询Stock表 │ → 获取待更新股票列表
└──────┬──────┘
       ↓
┌──────────────────┐
│ 查询KLineData表  │ → 获取每只股票的最新日期
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 并发调用API      │ → A股8并发, 港股/美股3并发
│ (主源+备源)      │ → 重试机制: 指数退避
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 数据验证         │ → 检查必填字段、数值合理性
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 批量写入         │ → 100条/批, 事务控制
│ KLineData表      │ → 时区转换: 本地时间→UTC
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 查询窗口数据     │ → 获取滑动窗口内历史数据
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 计算技术指标     │ → 复用TechnicalIndicatorsService
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 删除旧指标       │ → 删除受影响日期之后的指标
│ +插入新指标      │ → 批量插入
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 更新UpdateLog    │ → 更新进度计数器
└──────────────────┘
```

### 3.2 断点续传流程

```
┌──────────────────┐
│ 查询Checkpoint表 │
└──────┬───────────┘
       ↓
    有paused任务?
       ├─是──→ 从importedStocks位置继续
       └─否──→ 创建新任务
       ↓
┌──────────────────┐
│ 执行更新逻辑     │ → (同上增量更新流程)
└──────┬───────────┘
       ↓
    发生错误?
       ├─是──→ 更新status='paused'
       └─否──→ 更新status='completed'
```

---

## 4. 数据一致性保证

### 4.1 事务边界

```typescript
// 批量写入使用事务
await prisma.$transaction(async (tx) => {
  // 1. 插入K线数据
  await tx.kLineData.createMany({ data: batch });
  
  // 2. 删除旧指标
  await tx.technicalIndicator.deleteMany({
    where: { stockCode, date: { gte: affectedDate } },
  });
  
  // 3. 插入新指标
  await tx.technicalIndicator.createMany({ data: indicators });
});

// 如果中间任何步骤失败,所有操作自动回滚
```

### 4.2 幂等性保证

```typescript
// 使用skipDuplicates避免重复插入
await prisma.kLineData.createMany({
  data: records,
  skipDuplicates: true, // 遇到unique冲突跳过
});

// 或使用upsert
await prisma.kLineData.upsert({
  where: {
    stockCode_date_period: {
      stockCode,
      date,
      period: 'daily',
    },
  },
  update: { /* 更新字段 */ },
  create: { /* 创建记录 */ },
});
```

### 4.3 并发控制

```typescript
// 数据库连接池配置
datasources db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Prisma Client配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// SQLite WAL模式支持读写并发
// 多个读连接 + 1个写连接
```

---

## 5. 性能考量

### 5.1 索引利用

- `KLineData`: 使用 `(stockCode, period, date)` 联合索引
- `TechnicalIndicator`: 使用 `(stockCode, period, indicatorType, date)` 联合索引
- `UpdateLog`: 使用 `startTime` 索引
- `ImportCheckpoint`: 使用 `(market, status)` 和 `startTime` 索引

### 5.2 内存优化

- 批量操作时,每批100条记录,避免一次加载全部数据
- 使用流式查询处理大量股票列表
- 及时释放已完成股票的内存

### 5.3 数据库I/O优化

- 批量写入减少I/O次数
- 使用事务减少fsync调用
- SQLite WAL模式提高并发性能

---

## 总结

本数据模型基于现有数据库schema,不进行任何表结构修改。通过合理使用现有表、设计高效的内存数据结构、优化数据流转逻辑,实现性能优化目标。关键设计点:

1. **UpdateLog表**: 双重用途(监控 + 互斥锁)
2. **ImportCheckpoint表**: 断点续传核心
3. **批量操作**: 减少数据库I/O
4. **UTC时间**: 统一存储,简化查询
5. **内存缓存**: 减少重复API调用

下一步将在 `contracts/` 目录定义CLI命令接口契约。
