# 数据模型：股票分析工具

**Branch**: `001-stock-analysis-tool` | **Date**: 2026-02-28 | **Phase**: 1 (Design)

## 概述

本文档定义股票分析工具的数据模型，使用 Prisma ORM 管理 SQLite 数据库。所有模型遵循 TypeScript 类型安全原则，并提供完整的关系映射和索引优化。

---

## Prisma Schema

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================================================
// 1. 股票基础信息
// ============================================================================

model Stock {
  stockCode      String         @id @map("stock_code")
  stockName      String         @map("stock_name")
  market         String         // 'SH' | 'SZ'
  industry       String?
  listDate       DateTime       @map("list_date")
  marketCap      Float?         @map("market_cap")       // 市值(亿元)
  avgTurnover    Float?         @map("avg_turnover")     // 日均成交额(万元)
  admissionStatus String        @default("active") @map("admission_status") // 'active' | 'inactive'
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  // 关系
  klines         KLineData[]
  indicators     TechnicalIndicator[]
  favorites      Favorite[]
  drawings       Drawing[]

  @@map("stocks")
  @@index([admissionStatus])
  @@index([market])
}

// ============================================================================
// 2. K线数据
// ============================================================================

model KLineData {
  id         Int      @id @default(autoincrement())
  stockCode  String   @map("stock_code")
  date       DateTime
  period     String   // 'daily' | 'weekly'
  open       Float
  high       Float
  low        Float
  close      Float
  volume     Float    // 成交量(手)
  amount     Float    // 成交额(元)
  source     String   @default("tushare") // 'tushare' | 'akshare'
  createdAt  DateTime @default(now()) @map("created_at")

  // 关系
  stock      Stock    @relation(fields: [stockCode], references: [stockCode], onDelete: Cascade)

  @@unique([stockCode, date, period])
  @@index([stockCode, period, date])
  @@index([date])
  @@map("kline_data")
}

// ============================================================================
// 3. 技术指标
// ============================================================================

model TechnicalIndicator {
  id             Int      @id @default(autoincrement())
  stockCode      String   @map("stock_code")
  date           DateTime
  period         String   // 'daily' | 'weekly'
  indicatorType  String   @map("indicator_type") // 'ma' | 'kdj' | 'rsi' | 'volume' | 'amount' | 'week52_marker'
  
  // 指标值(JSON格式存储)
  // MA: {"ma50": 10.5, "ma150": 12.3, "ma200": 11.8}
  // KDJ: {"k": 50.2, "d": 48.5, "j": 53.6}
  // RSI: {"value": 65.4}
  // Volume: {"volume": 1000000, "ma52w": 800000}
  // Amount: {"amount": 50000000, "ma52w": 45000000}
  // Week52Marker: {"high": 15.8, "low": 8.2, "highDate": "2026-01-15", "lowDate": "2025-08-20"}
  values         String   // JSON string
  
  calculatedAt   DateTime @default(now()) @map("calculated_at")

  // 关系
  stock          Stock    @relation(fields: [stockCode], references: [stockCode], onDelete: Cascade)

  @@unique([stockCode, date, period, indicatorType])
  @@index([stockCode, period, indicatorType, date])
  @@map("technical_indicators")
}

// ============================================================================
// 4. 用户
// ============================================================================

model User {
  userId       String     @id @default(uuid()) @map("user_id")
  username     String     @unique
  passwordHash String     @map("password_hash")
  
  // 偏好设置(JSON)
  preferences  String?    // {"defaultPeriod": "daily", "defaultIndicators": ["ma", "volume"]}
  
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  // 关系
  favorites    Favorite[]
  strategies   ScreenerStrategy[]
  drawings     Drawing[]

  @@map("users")
}

// ============================================================================
// 5. 收藏列表
// ============================================================================

model Favorite {
  id         Int      @id @default(autoincrement())
  userId     String   @map("user_id")
  stockCode  String   @map("stock_code")
  groupName  String?  @map("group_name")    // 分组名称
  sortOrder  Int      @default(0) @map("sort_order")  // 排序顺序
  createdAt  DateTime @default(now()) @map("created_at")

  // 关系
  user       User     @relation(fields: [userId], references: [userId], onDelete: Cascade)
  stock      Stock    @relation(fields: [stockCode], references: [stockCode], onDelete: Cascade)

  @@unique([userId, stockCode])
  @@index([userId, sortOrder])
  @@map("favorites")
}

// ============================================================================
// 6. 选股策略
// ============================================================================

model ScreenerStrategy {
  strategyId     String   @id @default(uuid()) @map("strategy_id")
  userId         String   @map("user_id")
  strategyName   String   @map("strategy_name")
  description    String?
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // 关系
  user           User     @relation(fields: [userId], references: [userId], onDelete: Cascade)
  conditions     FilterCondition[]

  @@index([userId])
  @@map("screener_strategies")
}

// ============================================================================
// 7. 筛选条件
// ============================================================================

model FilterCondition {
  id            Int      @id @default(autoincrement())
  strategyId    String   @map("strategy_id")
  conditionType String   @map("condition_type") // 'indicator_value' | 'pattern' | 'price_change' | 'volume_change' | 'week_52_high' | 'week_52_low'
  
  // 根据 conditionType 使用不同字段
  indicatorName String?  @map("indicator_name") // 'ma50' | 'kdj_k' | 'rsi' | 'volume' | 'amount'
  operator      String?  // '>' | '<' | '>=' | '<=' | '='
  targetValue   Float?   @map("target_value")
  
  pattern       String?  // 'kdj_golden_cross' | 'kdj_death_cross' | 'price_above_ma' | 'price_below_ma'
  
  sortOrder     Int      @default(0) @map("sort_order")

  // 关系
  strategy      ScreenerStrategy @relation(fields: [strategyId], references: [strategyId], onDelete: Cascade)

  @@index([strategyId, sortOrder])
  @@map("filter_conditions")
}

// ============================================================================
// 8. 绘图对象
// ============================================================================

model Drawing {
  drawingId   String   @id @default(uuid()) @map("drawing_id")
  userId      String   @map("user_id")
  stockCode   String   @map("stock_code")
  period      String   // 'daily' | 'weekly'
  drawingType String   @map("drawing_type") // 'trend_line' | 'horizontal_line' | 'vertical_line' | 'rectangle'
  
  // 坐标数据(JSON)
  // TrendLine: [{"x": "2026-01-01", "y": 10.5}, {"x": "2026-02-01", "y": 12.3}]
  // HorizontalLine: [{"y": 10.5}]
  // VerticalLine: [{"x": "2026-01-15"}]
  // Rectangle: [{"x1": "2026-01-01", "y1": 10.5, "x2": "2026-02-01", "y2": 12.3}]
  coordinates String   // JSON string
  
  stylePreset String   @default("default") @map("style_preset") // 'default' (blue, 2px)
  createdAt   DateTime @default(now()) @map("created_at")

  // 关系
  user        User     @relation(fields: [userId], references: [userId], onDelete: Cascade)
  stock       Stock    @relation(fields: [stockCode], references: [stockCode], onDelete: Cascade)

  @@index([userId, stockCode, period])
  @@map("drawings")
}

// ============================================================================
// 9. 数据更新日志
// ============================================================================

model UpdateLog {
  taskId         String   @id @map("task_id")
  status         String   // 'pending' | 'running' | 'completed' | 'failed'
  totalStocks    Int      @map("total_stocks")
  processedStocks Int     @default(0) @map("processed_stocks")
  successCount   Int      @default(0) @map("success_count")
  failedCount    Int      @default(0) @map("failed_count")
  
  // 错误详情(JSON数组)
  // [{"stockCode": "600519", "errorReason": "API timeout", "retryResult": "success"}]
  errorDetails   String?  @map("error_details")
  
  startTime      DateTime @default(now()) @map("start_time")
  endTime        DateTime? @map("end_time")

  @@index([startTime])
  @@map("update_logs")
}
```

---

## 实体关系图(ERD)

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ 1:N
       ├─────────┬─────────┬─────────┐
       │         │         │         │
       ▼ N      ▼ N       ▼ N       ▼ N
┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Favorite │ │Strategy │ │ Drawing │ │UpdateLog│
└────┬─────┘ └────┬────┘ └────┬────┘ └─────────┘
     │ N:1        │ 1:N       │ N:1
     │            ▼            │
     │      ┌──────────────┐  │
     │      │FilterCondition│  │
     │      └──────────────┘  │
     │                        │
     └────────┬───────────────┘
              ▼ N:1
         ┌────────┐
         │ Stock  │
         └───┬────┘
             │ 1:N
       ┌─────┴──────┐
       ▼            ▼
┌────────────┐ ┌──────────────┐
│ KLineData  │ │TechnicalIndic│
└────────────┘ └──────────────┘
```

---

## 数据验证规则

### Stock (股票)
```typescript
// backend/src/entities/stock.dto.ts
import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateStockDto {
  @IsString()
  stockCode: string;

  @IsString()
  stockName: string;

  @IsEnum(['SH', 'SZ'])
  market: 'SH' | 'SZ';

  @IsOptional()
  @IsString()
  industry?: string;

  @IsNumber()
  marketCap: number;

  @IsNumber()
  @Min(0)
  avgTurnover: number;
}

// 准入标准验证
export function checkAdmission(stock: Stock): boolean {
  return (
    stock.marketCap > 50 &&           // 市值 > 50亿
    stock.avgTurnover > 1000 &&       // 日均成交额 > 1000万
    !stock.stockCode.includes('ST') && // 排除ST股
    new Date().getFullYear() - stock.listDate.getFullYear() >= 5 // 上市 > 5年
  );
}
```

### KLineData (K线数据)
```typescript
export class CreateKLineDto {
  @IsString()
  stockCode: string;

  @IsDateString()
  date: string;

  @IsEnum(['daily', 'weekly'])
  period: 'daily' | 'weekly';

  @IsNumber()
  @Min(0)
  open: number;

  @IsNumber()
  @Min(0)
  high: number;

  @IsNumber()
  @Min(0)
  low: number;

  @IsNumber()
  @Min(0)
  close: number;

  @IsNumber()
  @Min(0)
  volume: number;

  @IsNumber()
  @Min(0)
  amount: number;

  // 验证：high >= max(open, close), low <= min(open, close)
}
```

---

## 索引优化

### 高频查询索引

```prisma
// KLineData 查询优化
@@index([stockCode, period, date])  // 查询特定股票的K线数据
@@index([date])                     // 查询特定日期的所有股票数据

// TechnicalIndicator 查询优化
@@index([stockCode, period, indicatorType, date])  // 查询特定指标

// Favorite 查询优化
@@index([userId, sortOrder])  // 按排序查询用户收藏

// FilterCondition 查询优化
@@index([strategyId, sortOrder])  // 按顺序加载筛选条件
```

### 查询性能估算

| 查询场景 | 数据量 | 索引 | 预估时间 |
|---------|--------|------|---------|
| 单只股票20年日K | 5,000条 | ✅ | <50ms |
| 1000只股票最新价格 | 1,000条 | ✅ | <100ms |
| 技术指标筛选 | 1,000条 | ✅ | <500ms |
| 用户收藏列表 | <100条 | ✅ | <20ms |

---

## 存储空间估算

### 详细计算

```
1000只股票 × 20年数据:

日K线数据:
- 记录数: 1000 × 20 × 250 = 5,000,000 条
- 每条大小: 8 + 8 + 4 + 8*6 = 68 字节
- 总大小: 5,000,000 × 68 ≈ 340 MB

周K线数据:
- 记录数: 1000 × 20 × 52 = 1,040,000 条
- 总大小: 1,040,000 × 68 ≈ 71 MB

技术指标数据:
- 6种指标 × (5,000,000日 + 1,040,000周) = 36,240,000 条
- 每条大小: 8 + 8 + 4 + 200(JSON) = 220 字节
- 总大小: 36,240,000 × 220 ≈ 7.97 GB

索引开销: ~1.5 GB
其他表(User, Favorite, Strategy等): ~50 MB
---------
总计: 340MB + 71MB + 7.97GB + 1.5GB + 50MB ≈ 9.93 GB
实际(含SQLite开销): ~12-15 GB
```

**推荐预留空间**: 20 GB

---

## Prisma 迁移

### 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy
```

### 数据初始化脚本

```typescript
// backend/src/scripts/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建管理员用户
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: await bcrypt.hash('admin', 10),
      preferences: JSON.stringify({
        defaultPeriod: 'daily',
        defaultIndicators: ['ma', 'volume']
      })
    }
  });

  console.log('Admin user created:', admin);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## TypeScript 类型定义

### 自动生成的 Prisma 类型

```typescript
// node_modules/.prisma/client/index.d.ts (自动生成)
export type Stock = {
  stockCode: string;
  stockName: string;
  market: string;
  industry: string | null;
  listDate: Date;
  marketCap: number | null;
  avgTurnover: number | null;
  admissionStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type KLineData = {
  id: number;
  stockCode: string;
  date: Date;
  period: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  source: string;
  createdAt: Date;
};

// ... 其他类型自动生成
```

### 前端 TypeScript 接口

```typescript
// frontend/src/types/stock.ts
export interface Stock {
  stockCode: string;
  stockName: string;
  market: 'SH' | 'SZ';
  industry?: string;
  listDate: string;
  marketCap?: number;
  avgTurnover?: number;
  admissionStatus: 'active' | 'inactive';
  
  // 可选的实时数据
  latestPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
}

export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface IndicatorValues {
  ma?: { ma50: number; ma150: number; ma200: number };
  kdj?: { k: number; d: number; j: number };
  rsi?: { value: number };
  volume?: { volume: number; ma52w: number };
  amount?: { amount: number; ma52w: number };
  week52Marker?: {
    high: number;
    low: number;
    highDate: string;
    lowDate: string;
  };
}
```

---

## 数据迁移策略

### 从现有 Python 数据迁移

如果已经有 Python + SQLAlchemy 的数据：

```typescript
// backend/src/scripts/migrate-from-python.ts
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';

const prisma = new PrismaClient();
const oldDb = new Database('old-python.db');

async function migrate() {
  // 1. 迁移股票数据
  const stocks = oldDb.prepare('SELECT * FROM stocks').all();
  for (const stock of stocks) {
    await prisma.stock.create({
      data: {
        stockCode: stock.stock_code,
        stockName: stock.stock_name,
        market: stock.market,
        // ... 字段映射
      }
    });
  }

  // 2. 迁移K线数据（批量插入）
  const klines = oldDb.prepare('SELECT * FROM kline_data').all();
  await prisma.kLineData.createMany({
    data: klines.map(k => ({
      stockCode: k.stock_code,
      date: new Date(k.date),
      period: k.period,
      // ... 字段映射
    }))
  });

  console.log('Migration completed');
}

migrate();
```

---

## 性能优化建议

### 1. WAL 模式

```typescript
// backend/src/config/database.config.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10&socket_timeout=10'
    }
  }
});

// 启用 WAL 模式
await prisma.$executeRaw`PRAGMA journal_mode = WAL`;
await prisma.$executeRaw`PRAGMA synchronous = NORMAL`;
await prisma.$executeRaw`PRAGMA cache_size = -64000`; // 64MB
```

### 2. 批量插入

```typescript
// 不推荐：逐条插入
for (const kline of klines) {
  await prisma.kLineData.create({ data: kline });
}

// 推荐：批量插入
await prisma.kLineData.createMany({
  data: klines,
  skipDuplicates: true
});
```

### 3. 查询优化

```typescript
// 使用 select 减少返回字段
const stocks = await prisma.stock.findMany({
  select: {
    stockCode: true,
    stockName: true,
    // 不加载关联数据
  }
});

// 使用 where 过滤
const activeStocks = await prisma.stock.findMany({
  where: {
    admissionStatus: 'active',
    marketCap: { gt: 50 }
  }
});
```

---

## 总结

✅ **数据模型设计完成**

- 9个核心实体，完整的关系映射
- 使用 Prisma ORM，类型安全
- 优化的索引策略
- 详细的验证规则
- 存储空间估算：12-15GB（推荐预留20GB）

**下一步**: 生成 API 契约文档（contracts/api-spec.md）
