# 数据模型：港股和美股核心股票数据支持

**功能**: 005-hk-us-stock-data  
**日期**: 2026-03-12  
**状态**: Phase 1 Design

## 概述

本文档定义港股和美股数据支持所需的数据模型扩展。主要包括扩展Stock表以支持新市场类型和货币单位，以及新增ImportCheckpoint表用于断点续传。

## 实体关系图

```
┌─────────────────────────────────────────────────────────────┐
│                         Stock                                │
│  ─────────────────────────────────────────────────────────  │
│  stockCode: String (PK)  [扩展支持: "00700.HK", "AAPL.US"]  │
│  stockName: String       [原语言: "腾讯控股", "Apple Inc."] │
│  market: String          [扩展: 'SH'|'SZ'|'HK'|'US']        │
│  currency: String        [新增: 'CNY'|'HKD'|'USD']          │
│  searchKeywords: String  [新增: JSON格式搜索关键词]         │
│  industry: String?                                           │
│  listDate: DateTime                                          │
│  marketCap: Float?                                           │
│  admissionStatus: String                                     │
└─────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ↓
┌─────────────────────────────────────────────────────────────┐
│                      KLineData                               │
│  ─────────────────────────────────────────────────────────  │
│  id: Int (PK)                                                │
│  stockCode: String (FK)  [支持: "00700.HK", "AAPL.US"]      │
│  date: DateTime                                              │
│  period: String ('daily'|'weekly')                           │
│  open: Float                                                 │
│  high: Float                                                 │
│  low: Float                                                  │
│  close: Float                                                │
│  volume: Float                                               │
│  amount: Float                                               │
│  source: String  [扩展: 'tushare'|'akshare'|'yahoo_finance']│
└─────────────────────────────────────────────────────────────┘

         Stock
         │ 1:N
         ↓
┌─────────────────────────────────────────────────────────────┐
│                   VcpScanResult                              │
│  ─────────────────────────────────────────────────────────  │
│  id: Int (PK)                                                │
│  stockCode: String (FK)  [支持: "00700.HK", "AAPL.US"]      │
│  scanDate: DateTime                                          │
│  trendTemplatePass: Boolean                                  │
│  contractionCount: Int                                       │
│  ... (其他VCP指标)                                           │
│  [无需修改，自动支持新市场]                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ImportCheckpoint (新增，可选)                   │
│  ─────────────────────────────────────────────────────────  │
│  id: Int (PK)                                                │
│  taskId: String (Unique)                                     │
│  market: String ('HK' | 'US')                                │
│  totalStocks: Int                                            │
│  importedStocks: Int                                         │
│  failedStocks: String (JSON: 失败股票列表)                  │
│  status: String ('running' | 'completed' | 'failed')         │
│  startTime: DateTime                                         │
│  lastUpdateTime: DateTime                                    │
└─────────────────────────────────────────────────────────────┘
```

## 数据模型详细设计

### 1. Stock 表扩展

**现有字段** (保持不变):
```prisma
model Stock {
  stockCode       String   @id @map("stock_code")
  stockName       String   @map("stock_name")
  market          String   // 现有值: 'SH' | 'SZ'
  industry        String?
  listDate        DateTime @map("list_date")
  marketCap       Float?   @map("market_cap")
  avgTurnover     Float?   @map("avg_turnover")
  admissionStatus String   @default("active") @map("admission_status")
  indexCode       String?  @map("index_code")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
}
```

**新增字段**:
```prisma
model Stock {
  // ... 现有字段 ...
  
  currency        String   @default("CNY")  // 新增: 货币单位
  searchKeywords  String?  @map("search_keywords")  // 新增: 搜索关键词(JSON)
}
```

**字段说明**:

- `market`: 扩展枚举值
  - 现有: `'SH'` (上海), `'SZ'` (深圳)
  - 新增: `'HK'` (香港), `'US'` (美国)
  - 验证规则: 必须是这4个值之一

- `currency`: 货币单位
  - 类型: String, 默认'CNY'
  - 枚举值: `'CNY'` (人民币), `'HKD'` (港币), `'USD'` (美元)
  - 关联规则: 
    - market='SH'|'SZ' → currency='CNY'
    - market='HK' → currency='HKD'
    - market='US' → currency='USD'

- `searchKeywords`: 搜索关键词
  - 类型: String (存储JSON)
  - 格式: `{"zh": ["关键词1", "关键词2"], "en": ["keyword1", "keyword2"]}`
  - 示例: `{"zh": ["腾讯", "腾讯控股"], "en": ["Tencent", "Tencent Holdings"]}`
  - 可为null（未设置搜索关键词的股票）

**索引策略**:
```prisma
@@index([market])                    // 按市场筛选
@@index([admissionStatus])          // 现有索引
@@index([market, admissionStatus])  // 组合索引（优化多市场筛选）
```

**数据迁移**:
```sql
-- 为现有A股记录设置currency
UPDATE stocks SET currency = 'CNY' WHERE market IN ('SH', 'SZ');
```

### 2. KLineData 表

**无需修改结构**，现有设计已支持多市场：

```prisma
model KLineData {
  id        Int      @id @default(autoincrement())
  stockCode String   @map("stock_code")  // 支持: "00700.HK", "AAPL.US"
  date      DateTime
  period    String   // 'daily' | 'weekly'
  open      Float
  high      Float
  low       Float
  close     Float
  volume    Float
  amount    Float
  source    String   @default("tushare")  // 扩展: 'akshare', 'yahoo_finance'
  
  @@unique([stockCode, date, period])
  @@index([stockCode, period, date])
}
```

**source字段扩展**:
- 现有值: `'tushare'`
- 新增值: `'akshare'`, `'yahoo_finance'`
- 用途: 追踪数据来源，便于数据质量分析

### 3. VcpScanResult 表

**无需修改**，现有设计通过stockCode外键自动支持港股和美股：

```prisma
model VcpScanResult {
  id                   Int      @id @default(autoincrement())
  stockCode            String   @map("stock_code")  // 支持新格式
  scanDate             DateTime @map("scan_date")
  trendTemplatePass    Boolean  @map("trend_template_pass")
  contractionCount     Int      @map("contraction_count")
  // ... 其他字段 ...
  
  stock Stock @relation(fields: [stockCode], references: [stockCode])
}
```

### 4. ImportCheckpoint 表 (新增，可选)

**目的**: 记录导入任务的进度和状态，支持断点续传和任务追踪

```prisma
model ImportCheckpoint {
  id              Int      @id @default(autoincrement())
  taskId          String   @unique @map("task_id")  // UUID
  market          String   // 'HK' | 'US'
  importType      String   @map("import_type")  // 'initial' | 'update' | 'reindex'
  totalStocks     Int      @map("total_stocks")
  importedStocks  Int      @default(0) @map("imported_stocks")
  failedStocks    String?  @map("failed_stocks")  // JSON: [{code, error}]
  status          String   @default("running")  // 'running' | 'completed' | 'failed' | 'paused'
  startTime       DateTime @default(now()) @map("start_time")
  lastUpdateTime  DateTime @updatedAt @map("last_update_time")
  endTime         DateTime? @map("end_time")
  
  @@index([market, status])
  @@index([startTime])
  @@map("import_checkpoints")
}
```

**字段说明**:

- `taskId`: 任务唯一标识（UUID）
- `market`: 市场类型（'HK' | 'US'）
- `importType`: 导入类型
  - `'initial'`: 首次导入
  - `'update'`: 增量更新
  - `'reindex'`: 重新获取指数成分股
- `totalStocks`: 计划导入的股票总数
- `importedStocks`: 已成功导入的数量
- `failedStocks`: JSON格式的失败记录
  ```json
  [
    {
      "code": "00700.HK",
      "sources": ["akshare", "yahoo_finance"],
      "error": "Network timeout after 3 retries"
    }
  ]
  ```
- `status`: 任务状态
- `lastUpdateTime`: 最后更新时间（自动更新）

**使用场景**:
```typescript
// 1. 开始导入任务
const checkpoint = await prisma.importCheckpoint.create({
  data: {
    taskId: uuid(),
    market: 'HK',
    importType: 'initial',
    totalStocks: 110,
    status: 'running'
  }
});

// 2. 更新进度
await prisma.importCheckpoint.update({
  where: { taskId: checkpoint.taskId },
  data: { importedStocks: { increment: 1 } }
});

// 3. 记录失败
const failedList = JSON.parse(checkpoint.failedStocks || '[]');
failedList.push({ code: '00700.HK', error: '...' });
await prisma.importCheckpoint.update({
  where: { taskId: checkpoint.taskId },
  data: { failedStocks: JSON.stringify(failedList) }
});

// 4. 完成任务
await prisma.importCheckpoint.update({
  where: { taskId: checkpoint.taskId },
  data: { 
    status: 'completed',
    endTime: new Date()
  }
});
```

**注**: 也可以复用现有的UpdateLog表，但ImportCheckpoint提供更细粒度的导入任务追踪。

## 数据验证规则

### Stock 表验证

```typescript
interface StockValidation {
  // 股票代码格式
  stockCode: {
    'HK': /^\d{5}\.HK$/,      // 5位数字 + .HK
    'US': /^[A-Z]+\.US$/,     // 大写字母 + .US
    'SH': /^\d{6}\.SH$/,      // 现有: 6位数字 + .SH
    'SZ': /^\d{6}\.SZ$/,      // 现有: 6位数字 + .SZ
  };
  
  // 货币单位与市场的对应关系
  currencyByMarket: {
    'SH': 'CNY',
    'SZ': 'CNY',
    'HK': 'HKD',
    'US': 'USD',
  };
  
  // searchKeywords格式
  searchKeywords: {
    type: 'object',
    properties: {
      zh: { type: 'array', items: { type: 'string' } },
      en: { type: 'array', items: { type: 'string' } }
    }
  };
}
```

### KLineData 表验证

```typescript
interface KLineDataValidation {
  // 数据来源验证
  source: {
    allowedValues: ['tushare', 'akshare', 'yahoo_finance'],
    default: 'akshare'
  };
  
  // 价格数据合理性
  priceValidation: {
    open: { min: 0, max: 1000000 },    // 最高价格限制
    high: { min: 0, max: 1000000 },
    low: { min: 0, max: 1000000 },
    close: { min: 0, max: 1000000 },
    // 约束: low <= open <= high && low <= close <= high
  };
  
  // 成交量合理性
  volume: { min: 0 };
  amount: { min: 0 };
}
```

## 状态转换

### ImportCheckpoint 状态机

```
[创建任务]
    ↓
 running (运行中)
    ↓
    ├→ completed (成功完成)
    ├→ failed (失败)
    └→ paused (暂停，预留)
```

**状态转换规则**:
- `running` → `completed`: 当 importedStocks + failedStocks.length = totalStocks
- `running` → `failed`: 当发生不可恢复的系统错误
- `paused` → `running`: 手动恢复任务（预留功能）

### Stock admissionStatus

**现有状态**:
- `'active'`: 活跃股票（可交易）
- `'inactive'`: 不活跃（已退市、ST等）

**港股/美股适用**:
- 初次导入时默认设置为`'active'`
- 后续可根据交易状态更新

## 数据关系

### 一对多关系

```
Stock (1) ────── (N) KLineData
  │
  ├──────────── (N) VcpScanResult
  │
  ├──────────── (N) TechnicalIndicator
  │
  └──────────── (N) Favorite
```

**关系约束**:
- 所有子表通过stockCode外键关联Stock
- 级联删除: 删除Stock时级联删除所有关联数据
- stockCode格式必须符合Stock表的验证规则

### 查询优化

**常见查询模式**:

1. **按市场筛选股票**:
```typescript
const hkStocks = await prisma.stock.findMany({
  where: { market: 'HK' }
});
// 索引: @@index([market])
```

2. **跨语言搜索**:
```typescript
const results = await prisma.stock.findMany({
  where: {
    OR: [
      { stockName: { contains: searchTerm } },
      { stockCode: { contains: searchTerm } },
      { searchKeywords: { contains: searchTerm } }
    ]
  }
});
// 考虑为searchKeywords添加全文索引（SQLite FTS5）
```

3. **获取股票最新K线日期**:
```typescript
const latestKline = await prisma.kLineData.findFirst({
  where: { stockCode: '00700.HK', period: 'daily' },
  orderBy: { date: 'desc' }
});
// 索引: @@index([stockCode, period, date])
```

## 数据容量估算

### 存储空间

**港股数据** (110只):
- 基本信息: 110 × 500字节 ≈ 55KB
- K线数据: 110 × 2500条 × 100字节 ≈ 27.5MB
- 索引: 约5MB
- 小计: **约33MB**

**美股数据** (550只):
- 基本信息: 550 × 500字节 ≈ 275KB
- K线数据: 550 × 2500条 × 100字节 ≈ 137.5MB
- 索引: 约25MB
- 小计: **约163MB**

**总增长**: 约200MB (远低于预期的3-5GB，因为压缩和实际记录大小小于估算)

**现有数据库**: 2.6GB  
**扩展后**: 约2.8GB (在可接受范围内)

### 记录数量

- 现有KLineData记录: 约500万条（估算）
- 新增KLineData记录: 660 × 2500 = 1,650,000条
- 扩展后总计: 约665万条

### 性能影响

- 查询性能: 索引优化后，影响可忽略不计
- 导入性能: 批量插入（createMany），每批2500条约0.5秒
- 数据库文件大小: WAL模式下，文件增长平滑

## 数据完整性约束

### 业务规则

1. **股票代码唯一性**:
   - stockCode为主键，全局唯一
   - 港股、美股、A股不会有代码冲突（格式不同）

2. **K线数据唯一性**:
   - (stockCode, date, period)组合唯一
   - 同一只股票的同一天只有一条日K线记录

3. **货币单位一致性**:
   - 同一只股票的所有数据（K线、VCP分析）使用同一货币单位
   - 前端展示时从Stock表读取currency字段

4. **数据新鲜度**:
   - 最新K线日期应在7天以内（对于活跃股票）
   - 超过7天的数据在VCP分析时显示过期警告

### 引用完整性

```prisma
// KLineData外键约束
stock Stock @relation(fields: [stockCode], references: [stockCode], onDelete: Cascade)

// VcpScanResult外键约束
stock Stock @relation(fields: [stockCode], references: [stockCode], onDelete: Cascade)
```

**级联删除行为**:
- 删除Stock记录时，自动删除所有关联的KLineData和VcpScanResult
- 确保数据一致性，避免孤立记录

## TypeScript类型定义

### 前端类型

```typescript
// frontend/src/types/stock.ts

export type MarketType = 'SH' | 'SZ' | 'HK' | 'US';
export type CurrencyType = 'CNY' | 'HKD' | 'USD';

export interface Stock {
  stockCode: string;       // "00700.HK", "AAPL.US"
  stockName: string;       // "腾讯控股", "Apple Inc."
  market: MarketType;
  currency: CurrencyType;
  industry?: string;
  listDate: string;        // ISO date string
  marketCap?: number;
  searchKeywords?: {
    zh: string[];
    en: string[];
  };
}

export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  source: 'tushare' | 'akshare' | 'yahoo_finance';
}

// 货币符号映射
export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = {
  'CNY': '¥',
  'HKD': 'HK$',
  'USD': '$',
};

// 市场显示名称
export const MARKET_LABELS: Record<MarketType, string> = {
  'SH': 'A股(沪)',
  'SZ': 'A股(深)',
  'HK': '港股',
  'US': '美股',
};
```

### 后端类型

```typescript
// backend/src/types/stock.ts

export enum MarketType {
  SH = 'SH',
  SZ = 'SZ',
  HK = 'HK',
  US = 'US',
}

export enum CurrencyType {
  CNY = 'CNY',
  HKD = 'HKD',
  USD = 'USD',
}

export interface StockBasicInfo {
  code: string;
  name: string;
  market: MarketType;
  currency: CurrencyType;
  industry?: string;
  listDate: Date;
}

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  duration: number;  // milliseconds
}

export interface ImportError {
  stockCode: string;
  attemptedSources: Array<{
    source: 'akshare' | 'yahoo_finance';
    errorType: string;
    errorMessage: string;
  }>;
}
```

## 数据示例

### Stock 表示例数据

```json
[
  {
    "stockCode": "00700.HK",
    "stockName": "腾讯控股",
    "market": "HK",
    "currency": "HKD",
    "industry": "互联网",
    "listDate": "2004-06-16",
    "marketCap": 35000.0,
    "admissionStatus": "active",
    "indexCode": "HSI",
    "searchKeywords": "{\"zh\": [\"腾讯\", \"腾讯控股\"], \"en\": [\"Tencent\", \"Tencent Holdings\"]}"
  },
  {
    "stockCode": "AAPL.US",
    "stockName": "Apple Inc.",
    "market": "US",
    "currency": "USD",
    "industry": "Technology",
    "listDate": "1980-12-12",
    "marketCap": 28000.0,
    "admissionStatus": "active",
    "indexCode": "SP500",
    "searchKeywords": "{\"zh\": [\"苹果\", \"苹果公司\"], \"en\": [\"Apple\", \"AAPL\"]}"
  }
]
```

### KLineData 表示例数据

```json
{
  "stockCode": "00700.HK",
  "date": "2026-03-11",
  "period": "daily",
  "open": 385.5,
  "high": 392.0,
  "low": 383.2,
  "close": 390.8,
  "volume": 25600000,
  "amount": 9984000000,
  "source": "akshare"
}
```

## 迁移清单

### 数据库迁移步骤

1. **添加新字段**:
```sql
ALTER TABLE stocks ADD COLUMN currency TEXT DEFAULT 'CNY';
ALTER TABLE stocks ADD COLUMN search_keywords TEXT;
```

2. **更新现有数据**:
```sql
-- 为现有A股设置货币单位
UPDATE stocks SET currency = 'CNY' WHERE market IN ('SH', 'SZ');
```

3. **创建新索引**:
```sql
CREATE INDEX idx_stocks_market_status ON stocks(market, admission_status);
```

4. **创建新表** (如果使用ImportCheckpoint):
```sql
CREATE TABLE import_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT UNIQUE NOT NULL,
  market TEXT NOT NULL,
  import_type TEXT NOT NULL,
  total_stocks INTEGER NOT NULL,
  imported_stocks INTEGER DEFAULT 0,
  failed_stocks TEXT,
  status TEXT DEFAULT 'running',
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME
);
```

### 验证步骤

1. 验证现有A股数据不受影响:
```typescript
const aStockCount = await prisma.stock.count({
  where: { market: { in: ['SH', 'SZ'] } }
});
// 应该与迁移前相同
```

2. 验证currency字段正确设置:
```typescript
const invalidCurrency = await prisma.stock.findMany({
  where: {
    OR: [
      { market: 'SH', currency: { not: 'CNY' } },
      { market: 'SZ', currency: { not: 'CNY' } },
    ]
  }
});
// 应该为空数组
```

3. 验证索引创建成功:
```sql
SELECT name FROM sqlite_master 
WHERE type='index' AND tbl_name='stocks' 
AND name='idx_stocks_market_status';
```

## 数据模型版本

**当前版本**: v1.1.0  
**变更内容**:
- Stock表: 添加currency和searchKeywords字段
- Stock.market: 扩展枚举值支持'HK'和'US'
- KLineData.source: 扩展枚举值支持'akshare'和'yahoo_finance'
- 新增ImportCheckpoint表（可选）

**向后兼容性**: ✅ 完全兼容
- 现有A股数据继续使用market='SH'|'SZ'和currency='CNY'
- 现有查询逻辑无需修改（除非需要市场筛选）
- 新字段使用默认值或nullable，不影响现有记录

**前向兼容性**: ✅ 支持未来扩展
- 可继续添加新市场（如'UK'、'JP'）
- 可继续添加新货币单位
- searchKeywords支持动态扩展语言（如添加'jp'日文关键词）
