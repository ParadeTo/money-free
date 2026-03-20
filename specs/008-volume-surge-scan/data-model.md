# 数据模型设计：成交量激增扫描器

**功能**: 008-volume-surge-scan | **日期**: 2026-03-18  
**目的**: 定义数据实体、关系、验证规则和查询模式

## 实体关系图

```
┌──────────────┐
│    Stock     │ (现有表)
│ - ts_code    │
│ - name       │
│ - market     │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────▼───────────────┐
│   KLineData          │ (现有表)
│ - date               │
│ - open/close/high/low│
│ - volume             │
└──────────────────────┘

       ▲
       │ 查询
       │
┌──────┴───────────────┐
│ VolumeSurgeScan      │ (新增表)
│ - id                 │
│ - scan_date          │
│ - scan_mode          │
│ - reference_date     │
│ - status             │
│ - total_stocks       │
│ - matched_stocks     │
│ - duration_ms        │
│ - created_at         │
└──────┬───────────────┘
       │ 1
       │
       │ N
┌──────▼───────────────┐
│   ScanResult         │ (新增表)
│ - id                 │
│ - scan_id            │
│ - stock_code         │
│ - contraction_*      │
│ - expansion_*        │
│ - ma50/ma150         │
│ - volume_ratio       │
│ - meets_all_criteria │
└──────────────────────┘
```

## 实体定义

### 1. VolumeSurgeScan（扫描记录）

**用途**: 存储每次扫描的元数据和统计信息

**字段**:

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String (UUID) | PK | 扫描唯一标识 |
| scan_date | DateTime | NOT NULL | 扫描执行日期 |
| scan_mode | Enum | NOT NULL | 'auto' 或 'manual' |
| reference_date | DateTime | NULLABLE | 手动模式的参考日期 |
| status | Enum | NOT NULL | 'running', 'completed', 'failed', 'cancelled' |
| total_stocks | Integer | NOT NULL | 总扫描股票数 |
| matched_stocks | Integer | NOT NULL | 符合条件的股票数 |
| duration_ms | Integer | NULLABLE | 扫描耗时（毫秒） |
| error_message | String | NULLABLE | 失败原因（status=failed时） |
| created_by | String | NULLABLE | 触发来源（'web', 'cli'） |
| created_at | DateTime | NOT NULL | 创建时间 |
| updated_at | DateTime | NOT NULL | 更新时间 |

**验证规则**:
- `scan_mode = 'manual'` 时，`reference_date` 必须非空
- `scan_mode = 'auto'` 时，`reference_date` 必须为空
- `status = 'completed'` 时，`duration_ms` 必须非空
- `matched_stocks` <= `total_stocks`

**索引**:
- `idx_scan_date` ON (scan_date DESC)
- `idx_status` ON (status)

---

### 2. ScanResult（扫描结果）

**用途**: 存储每只股票的扫描详细结果

**字段**:

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String (UUID) | PK | 结果唯一标识 |
| scan_id | String (UUID) | FK → VolumeSurgeScan.id, NOT NULL | 所属扫描 |
| stock_code | String | FK → Stock.ts_code, NOT NULL | 股票代码 |
| contraction_start_date | DateTime | NOT NULL | 萎缩期起始日期 |
| contraction_end_date | DateTime | NOT NULL | 萎缩期结束日期 |
| contraction_avg_volume | Float | NOT NULL | 萎缩期平均成交量 |
| expansion_start_date | DateTime | NOT NULL | 放大起始日期 |
| expansion_days | Integer | NOT NULL | 放大后天数 |
| expansion_multiplier | Float | NOT NULL | 放大倍数（相对萎缩期） |
| up_day_avg_volume | Float | NOT NULL | 上涨日平均成交量 |
| down_day_avg_volume | Float | NOT NULL | 下降日平均成交量 |
| volume_support_ratio | Float | NOT NULL | 买量支撑比率（上涨日/下降日） |
| ma50_value | Float | NOT NULL | 50日均线值 |
| ma150_value | Float | NOT NULL | 150日均线值 |
| ma50_slope | Float | NOT NULL | 50日均线斜率 |
| ma50_trending_up | Boolean | NOT NULL | 50日均线向上趋势 |
| ma50_below_ma150 | Boolean | NOT NULL | 50日均线低于150日均线 |
| meets_volume_criteria | Boolean | NOT NULL | 满足成交量条件 |
| meets_ma_criteria | Boolean | NOT NULL | 满足均线条件 |
| meets_support_criteria | Boolean | NOT NULL | 满足买量支撑条件 |
| meets_all_criteria | Boolean | NOT NULL | 满足所有条件 |
| created_at | DateTime | NOT NULL | 创建时间 |

**验证规则**:
- `contraction_end_date` >= `contraction_start_date`
- `expansion_start_date` > `contraction_end_date`
- `expansion_multiplier` >= 1.5（按规格FR-002）
- `volume_support_ratio` = `up_day_avg_volume` / `down_day_avg_volume`
- `meets_all_criteria` = `meets_volume_criteria` AND `meets_ma_criteria` AND `meets_support_criteria`

**索引**:
- `idx_scan_stock` ON (scan_id, stock_code) UNIQUE
- `idx_criteria` ON (meets_all_criteria, volume_support_ratio DESC)
- `idx_stock_code` ON (stock_code)

---

### 3. Stock（现有表，引用）

**相关字段**:
- `ts_code`: String (PK) - 股票代码
- `name`: String - 股票名称
- `market`: String - 市场类型

**关系**: ScanResult.stock_code → Stock.ts_code

---

### 4. KLineData（现有表，引用）

**相关字段**:
- `ts_code`: String (FK) - 股票代码
- `trade_date`: DateTime - 交易日期
- `open/close/high/low`: Float - OHLC价格
- `vol`: Float - 成交量

**关系**: 扫描服务查询此表获取K线数据

---

## Prisma Schema定义

```prisma
// 新增模型

model VolumeSurgeScan {
  id              String        @id @default(uuid())
  scanDate        DateTime      @map("scan_date")
  scanMode        ScanMode      @map("scan_mode")
  referenceDate   DateTime?     @map("reference_date")
  status          ScanStatus
  totalStocks     Int           @map("total_stocks")
  matchedStocks   Int           @map("matched_stocks")
  durationMs      Int?          @map("duration_ms")
  errorMessage    String?       @map("error_message")
  createdBy       String?       @map("created_by")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  
  results         ScanResult[]
  
  @@index([scanDate(sort: Desc)], name: "idx_scan_date")
  @@index([status], name: "idx_status")
  @@map("volume_surge_scans")
}

model ScanResult {
  id                      String            @id @default(uuid())
  scanId                  String            @map("scan_id")
  stockCode               String            @map("stock_code")
  
  // 成交量模式
  contractionStartDate    DateTime          @map("contraction_start_date")
  contractionEndDate      DateTime          @map("contraction_end_date")
  contractionAvgVolume    Float             @map("contraction_avg_volume")
  expansionStartDate      DateTime          @map("expansion_start_date")
  expansionDays           Int               @map("expansion_days")
  expansionMultiplier     Float             @map("expansion_multiplier")
  
  // 买量支撑
  upDayAvgVolume          Float             @map("up_day_avg_volume")
  downDayAvgVolume        Float             @map("down_day_avg_volume")
  volumeSupportRatio      Float             @map("volume_support_ratio")
  
  // 均线状态
  ma50Value               Float             @map("ma50_value")
  ma150Value              Float             @map("ma150_value")
  ma50Slope               Float             @map("ma50_slope")
  ma50TrendingUp          Boolean           @map("ma50_trending_up")
  ma50BelowMa150          Boolean           @map("ma50_below_ma150")
  
  // 条件判断
  meetsVolumeCriteria     Boolean           @map("meets_volume_criteria")
  meetsMaCriteria         Boolean           @map("meets_ma_criteria")
  meetsSupportCriteria    Boolean           @map("meets_support_criteria")
  meetsAllCriteria        Boolean           @map("meets_all_criteria")
  
  createdAt               DateTime          @default(now()) @map("created_at")
  
  scan                    VolumeSurgeScan   @relation(fields: [scanId], references: [id], onDelete: Cascade)
  stock                   Stock             @relation(fields: [stockCode], references: [tsCode])
  
  @@unique([scanId, stockCode], name: "unique_scan_stock")
  @@index([meetsAllCriteria, volumeSupportRatio(sort: Desc)], name: "idx_criteria")
  @@index([stockCode], name: "idx_stock_code")
  @@map("scan_results")
}

enum ScanMode {
  AUTO
  MANUAL
}

enum ScanStatus {
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## 查询模式

### 查询1：获取最近N次扫描记录

```typescript
const recentScans = await prisma.volumeSurgeScan.findMany({
  where: { status: 'COMPLETED' },
  orderBy: { scanDate: 'desc' },
  take: 10,
  include: {
    _count: {
      select: { results: true },
    },
  },
});
```

**用途**: 历史扫描列表页（FR-013）

---

### 查询2：获取某次扫描的符合条件股票

```typescript
const matchedStocks = await prisma.scanResult.findMany({
  where: {
    scanId: scanId,
    meetsAllCriteria: true,
  },
  orderBy: { volumeSupportRatio: 'desc' },
  include: {
    stock: {
      select: { name: true, market: true },
    },
  },
});
```

**用途**: 扫描结果展示页（用户故事3）

---

### 查询3：对比两次扫描结果（识别持续符合条件的股票）

```typescript
const persistentStocks = await prisma.$queryRaw`
  SELECT 
    r1.stock_code,
    s.name,
    r1.volume_support_ratio AS ratio_scan1,
    r2.volume_support_ratio AS ratio_scan2
  FROM scan_results r1
  JOIN scan_results r2 ON r1.stock_code = r2.stock_code
  JOIN stocks s ON r1.stock_code = s.ts_code
  WHERE r1.scan_id = ${scanId1}
    AND r2.scan_id = ${scanId2}
    AND r1.meets_all_criteria = true
    AND r2.meets_all_criteria = true
  ORDER BY r2.volume_support_ratio DESC;
`;
```

**用途**: 历史对比功能（用户故事3）

---

### 查询4：检查某只股票的扫描历史

```typescript
const stockHistory = await prisma.scanResult.findMany({
  where: { stockCode: 'SH600111' },
  orderBy: { scan: { scanDate: 'desc' } },
  take: 5,
  include: {
    scan: {
      select: { scanDate: true, scanMode: true },
    },
  },
});
```

**用途**: 追踪股票是否持续符合条件（FR-013）

---

## 数据迁移策略

### 初始迁移

```bash
npx prisma migrate dev --name add_volume_surge_scan_tables
```

生成SQL（SQLite）：
```sql
CREATE TABLE "volume_surge_scans" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scan_date" DATETIME NOT NULL,
  "scan_mode" TEXT NOT NULL,
  "reference_date" DATETIME,
  "status" TEXT NOT NULL,
  "total_stocks" INTEGER NOT NULL,
  "matched_stocks" INTEGER NOT NULL,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "created_by" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE TABLE "scan_results" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scan_id" TEXT NOT NULL,
  "stock_code" TEXT NOT NULL,
  "contraction_start_date" DATETIME NOT NULL,
  "contraction_end_date" DATETIME NOT NULL,
  "contraction_avg_volume" REAL NOT NULL,
  "expansion_start_date" DATETIME NOT NULL,
  "expansion_days" INTEGER NOT NULL,
  "expansion_multiplier" REAL NOT NULL,
  "up_day_avg_volume" REAL NOT NULL,
  "down_day_avg_volume" REAL NOT NULL,
  "volume_support_ratio" REAL NOT NULL,
  "ma50_value" REAL NOT NULL,
  "ma150_value" REAL NOT NULL,
  "ma50_slope" REAL NOT NULL,
  "ma50_trending_up" BOOLEAN NOT NULL,
  "ma50_below_ma150" BOOLEAN NOT NULL,
  "meets_volume_criteria" BOOLEAN NOT NULL,
  "meets_ma_criteria" BOOLEAN NOT NULL,
  "meets_support_criteria" BOOLEAN NOT NULL,
  "meets_all_criteria" BOOLEAN NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("scan_id") REFERENCES "volume_surge_scans" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("stock_code") REFERENCES "stocks" ("ts_code")
);

CREATE INDEX "idx_scan_date" ON "volume_surge_scans" ("scan_date" DESC);
CREATE INDEX "idx_status" ON "volume_surge_scans" ("status");
CREATE UNIQUE INDEX "unique_scan_stock" ON "scan_results" ("scan_id", "stock_code");
CREATE INDEX "idx_criteria" ON "scan_results" ("meets_all_criteria", "volume_support_ratio" DESC);
CREATE INDEX "idx_stock_code" ON "scan_results" ("stock_code");
```

---

## 数据容量估算

**假设**:
- 每次扫描3000只股票
- 平均10%股票符合条件（300只）
- 每月扫描10次
- 保留12个月历史数据

**存储需求**:
- VolumeSurgeScan: 10次/月 × 12月 = 120条记录 ≈ 10KB
- ScanResult: 300只/次 × 10次/月 × 12月 = 36,000条记录 ≈ 5MB

**总计**: 约5MB（可忽略，SQLite单文件数据库当前约2.6GB）

---

## 状态转换

### VolumeSurgeScan.status状态机

```
RUNNING ──┬──> COMPLETED (正常完成)
          ├──> FAILED (扫描过程错误)
          └──> CANCELLED (用户中断)

不可逆转换，一旦进入终态（COMPLETED/FAILED/CANCELLED）不可更改
```

**状态转换规则**:
- 创建时：`RUNNING`
- 扫描完成且无错误：`RUNNING` → `COMPLETED`
- 扫描过程异常：`RUNNING` → `FAILED` (记录error_message)
- 用户中断（Ctrl+C或Web关闭）：`RUNNING` → `CANCELLED`

---

## 数据完整性约束

1. **级联删除**: 删除 VolumeSurgeScan 时自动删除关联的 ScanResult
2. **外键约束**: ScanResult.stock_code 必须存在于 Stock 表
3. **唯一性约束**: 同一次扫描中，每只股票只能有一条结果记录
4. **条件一致性**: `meets_all_criteria` 必须通过计算字段验证（可通过数据库触发器或应用层保证）

---

**下一步**: 定义API契约（contracts/api.md）
