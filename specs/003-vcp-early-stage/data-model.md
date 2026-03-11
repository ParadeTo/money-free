# Phase 1: 数据模型

**日期**: 2026-03-11  
**目的**: 定义早期启动筛选功能涉及的核心实体、字段、关系和验证规则

## 实体定义

### 1. FilterConditions（筛选条件）

**用途**: 表示用户设置的筛选条件

**字段**:

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| distFrom52WeekLow | number | 20-60 | 40 | 距52周低点阈值（%） |
| distFrom52WeekHigh | number | 10-50 | 30 | 距52周高点阈值（%） |
| contractionCountMin | number | 2-8 | 3 | 最小收缩次数 |
| contractionCountMax | number | 2-8 | 4 | 最大收缩次数 |

**验证规则**:
- `contractionCountMin <= contractionCountMax`
- 所有阈值必须在有效范围内
- 数值类型必须是正整数或浮点数

**状态转换**: N/A（无状态机，仅数据对象）

**示例**:
```typescript
const defaultConditions: FilterConditions = {
  distFrom52WeekLow: 40,
  distFrom52WeekHigh: 30,
  contractionCountMin: 3,
  contractionCountMax: 4,
};
```

---

### 2. EarlyStageStock（早期阶段股票）

**用途**: 表示筛选结果中的单只股票及其详细信息

**字段**:

| 字段名 | 类型 | 约束 | 来源 | 说明 |
|--------|------|------|------|------|
| stockCode | string | 6位数字/字母 | vcpScanResult | 股票代码 |
| stockName | string | 非空 | stock表 | 股票名称 |
| latestPrice | number | >0 | vcpScanResult | 最新价格 |
| priceChangePct | number | - | vcpScanResult | 涨跌幅% |
| distFrom52WeekHigh | number | - | vcpScanResult | 距52周高点% |
| distFrom52WeekLow | number | - | vcpScanResult | 距52周低点% |
| contractionCount | number | ≥3 | vcpScanResult | 收缩次数 |
| lastContractionPct | number | - | vcpScanResult | 最后收缩幅度% |
| rsRating | number | 0-100 | vcpScanResult | RS评分 |
| volumeDryingUp | boolean | - | vcpScanResult | 成交量是否萎缩 |
| vcpStage | VcpStage | enum | 实时计算 | VCP阶段 |
| pullbackInfo | PullbackInfo? | nullable | 实时计算 | 回调信息（如有） |

**VcpStage枚举**:
```typescript
enum VcpStage {
  CONTRACTION = 'contraction',     // 收缩中
  IN_PULLBACK = 'in_pullback',     // 回调中
  PULLBACK_ENDED = 'pullback_ended' // 回调结束
}
```

**关系**:
- EarlyStageStock.stockCode → Stock.stockCode（外键，多对一）
- EarlyStageStock.pullbackInfo → PullbackInfo（嵌入对象，一对零或一）

**验证规则**:
- stockCode必须存在于stock表
- contractionCount必须≥3（VCP基本条件）
- distFrom52WeekLow和distFrom52WeekHigh必须符合筛选条件
- vcpStage必须是有效枚举值

**排序规则**:
1. 首先按vcpStage排序：contraction > in_pullback > pullback_ended
2. 同一vcpStage内按distFrom52WeekLow升序排序（距低点越近排越前）

**示例**:
```typescript
const exampleStock: EarlyStageStock = {
  stockCode: '002142',
  stockName: '宁波银行',
  latestPrice: 31.56,
  priceChangePct: 0.45,
  distFrom52WeekHigh: 4.13,
  distFrom52WeekLow: 44.44,
  contractionCount: 3,
  lastContractionPct: 6.53,
  rsRating: 74,
  volumeDryingUp: false,
  vcpStage: VcpStage.IN_PULLBACK,
  pullbackInfo: {
    durationDays: 6,
    pullbackPct: 4.73,
    highPrice: 32.58,
    lowPrice: 31.04,
    highDate: '2026-03-02',
    lowDate: '2026-03-10',
    daysSinceLow: 0,
    recoveryPct: 1.68,
  },
};
```

---

### 3. PullbackInfo（回调信息）

**用途**: 表示股票当前的回调状态详情

**字段**:

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| durationDays | number | ≥1 | 回调持续天数 |
| pullbackPct | number | >0 | 回调幅度% |
| highPrice | number | >0 | 回调前高点价格 |
| lowPrice | number | >0 | 回调低点价格 |
| highDate | string | ISO日期 | 回调前高点日期 |
| lowDate | string | ISO日期 | 回调低点日期 |
| daysSinceLow | number | ≥0 | 距离回调低点天数 |
| recoveryPct | number | - | 从低点反弹% |

**验证规则**:
- lowPrice < highPrice
- lowDate >= highDate（时间顺序）
- pullbackPct = ((highPrice - lowPrice) / highPrice) * 100
- recoveryPct = ((currentPrice - lowPrice) / lowPrice) * 100

**状态转换**: N/A（计算得出，非用户输入）

---

### 4. FilterResult（筛选结果）

**用途**: 封装筛选API的响应数据

**字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| stocks | EarlyStageStock[] | 筛选出的股票列表 |
| total | number | 总数量 |
| appliedConditions | FilterConditions | 实际应用的筛选条件 |
| tip | ResultTip? | 智能提示（可选） |

**ResultTip枚举**:
```typescript
interface ResultTip {
  type: 'warning' | 'info' | 'error';
  message: string;
  suggestedActions: QuickAction[];
}

interface QuickAction {
  label: string;         // 如"放宽5%"
  adjustments: Partial<FilterConditions>; // 调整后的条件
}
```

**生成规则**:
- total < 5 → type='warning', message='筛选结果较少，建议放宽条件'
- total > 30 → type='info', message='筛选结果较多，建议收紧条件'
- total === 0 → type='error', message='未找到符合条件的股票'

**示例**:
```typescript
const filterResult: FilterResult = {
  stocks: [/* EarlyStageStock数组 */],
  total: 7,
  appliedConditions: {
    distFrom52WeekLow: 40,
    distFrom52WeekHigh: 30,
    contractionCountMin: 3,
    contractionCountMax: 4,
  },
  tip: {
    type: 'warning',
    message: '当前条件筛选出7只股票，建议放宽筛选条件',
    suggestedActions: [
      {
        label: '放宽5%',
        adjustments: { distFrom52WeekLow: 45 },
      },
      {
        label: '放宽10%',
        adjustments: { distFrom52WeekLow: 50 },
      },
    ],
  },
};
```

---

### 5. StoredFilterConditions（LocalStorage存储结构）

**用途**: localStorage中的筛选条件持久化格式

**字段**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| version | string | 数据结构版本（如'1.0.0'） |
| timestamp | number | 最后更新时间戳 |
| conditions | FilterConditions | 筛选条件对象 |

**存储键**: `money-free:vcp-early-filter:v1`

**验证规则**:
- version必须匹配当前应用版本（不匹配则忽略）
- timestamp用于未来的缓存失效策略
- conditions必须通过FilterConditions验证规则

**示例**:
```typescript
const storedData: StoredFilterConditions = {
  version: '1.0.0',
  timestamp: 1710144000000,
  conditions: {
    distFrom52WeekLow: 35,
    distFrom52WeekHigh: 25,
    contractionCountMin: 2,
    contractionCountMax: 5,
  },
};

// 存储
localStorage.setItem('money-free:vcp-early-filter:v1', JSON.stringify(storedData));

// 读取
const stored = localStorage.getItem('money-free:vcp-early-filter:v1');
if (stored) {
  const data: StoredFilterConditions = JSON.parse(stored);
  if (data.version === '1.0.0') {
    // 使用data.conditions
  }
}
```

---

## 实体关系图

```
┌─────────────────────┐
│  FilterConditions   │
│  (用户输入)         │
└──────────┬──────────┘
           │ 作为参数传入
           ↓
┌─────────────────────┐
│  FilterResult       │
│  (API响应)          │
├─────────────────────┤
│ + stocks[]          │───┐
│ + total             │   │
│ + appliedConditions │   │
│ + tip               │   │
└─────────────────────┘   │
                          │ 包含
                          ↓
                 ┌────────────────────┐
                 │  EarlyStageStock   │
                 │  (筛选结果项)      │
                 ├────────────────────┤
                 │ + stockCode        │
                 │ + stockName        │
                 │ + latestPrice      │
                 │ + vcpStage         │
                 │ + pullbackInfo     │───┐
                 │ + ...              │   │
                 └────────────────────┘   │
                                          │ 嵌入
                                          ↓
                                 ┌─────────────────┐
                                 │  PullbackInfo   │
                                 │  (回调详情)     │
                                 ├─────────────────┤
                                 │ + durationDays  │
                                 │ + pullbackPct   │
                                 │ + ...           │
                                 └─────────────────┘

┌────────────────────────┐
│ StoredFilterConditions │
│ (localStorage)         │
├────────────────────────┤
│ + version              │
│ + timestamp            │
│ + conditions           │─────引用─────→ FilterConditions
└────────────────────────┘
```

---

## 数据流

### 筛选流程

```
1. 用户输入 FilterConditions
   ↓
2. 前端验证 (范围检查)
   ↓
3. 调用 POST /api/vcp/early-stage
   ↓
4. 后端查询 vcpScanResult表
   ↓
5. 后端调用 VcpAnalyzerService (实时计算vcpStage)
   ↓
6. 后端构建 EarlyStageStock[]
   ↓
7. 后端应用排序规则
   ↓
8. 后端生成 ResultTip (基于total)
   ↓
9. 返回 FilterResult
   ↓
10. 前端展示结果 + 高亮"收缩中"股票
    ↓
11. 前端保存条件到 localStorage
```

---

## 索引策略

**数据库索引**（如需优化查询性能）:

```sql
-- vcpScanResult表
CREATE INDEX idx_vcp_early_stage ON vcpScanResult (
  scanDate DESC,
  trendTemplatePass,
  contractionCount,
  distFrom52WeekLow,
  distFrom52WeekHigh
);
```

**说明**: 
- scanDate DESC: 获取最新扫描结果
- trendTemplatePass: 快速过滤未通过趋势模板的股票
- contractionCount, distFrom52WeekLow/High: 支持范围查询

---

## 总结

| 实体 | 来源 | 用途 |
|------|------|------|
| FilterConditions | 用户输入 | 筛选条件 |
| EarlyStageStock | 数据库+计算 | 筛选结果项 |
| PullbackInfo | 实时计算 | 回调详情 |
| FilterResult | API响应 | 完整响应体 |
| StoredFilterConditions | localStorage | 持久化 |

**下一步**: 定义API契约（/contracts/）
