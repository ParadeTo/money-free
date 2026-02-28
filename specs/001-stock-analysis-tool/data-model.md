# 数据模型设计

**项目**: 股票分析工具  
**日期**: 2026-02-28  
**来源**: 从 spec.md "关键实体" 章节提取并扩展

---

## 实体关系图（ERD概述）

```text
┌─────────────┐
│   User      │
│  (预设admin) │
└──────┬──────┘
       │
       │ 1:N
       ├─────────────────┬─────────────────┬──────────────────┐
       │                 │                 │                  │
       ▼                 ▼                 ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  Favorite   │  │  Strategy   │  │   Drawing    │  │   Session    │
│  (收藏列表)  │  │ (选股策略)   │  │  (绘图对象)   │  │  (会话令牌)   │
└──────┬──────┘  └──────┬──────┘  └───────┬──────┘  └──────────────┘
       │                │                 │
       │ N:1            │ 1:N             │ N:1
       │                │                 │
       ▼                ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Stock     │  │   Filter    │  │   Stock     │
│  (股票信息)  │  │ Condition   │  │  (股票信息)  │
└──────┬──────┘  │  (筛选条件)  │  └─────────────┘
       │         └─────────────┘
       │ 1:N
       │
       ▼
┌─────────────┐
│  KLineData  │
│  (K线数据)   │
└──────┬──────┘
       │ 1:N
       │
       ▼
┌─────────────┐
│  Indicator  │
│ (技术指标数据)│
└─────────────┘
```

---

## 实体定义

### 1. Stock（股票）

**描述**: 代表一只股票的基本信息，仅包含符合准入标准的股票（约1000只）

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `stock_code` | TEXT | PRIMARY KEY | 股票代码（6位数字） | "600519" |
| `stock_name` | TEXT | NOT NULL | 股票名称 | "贵州茅台" |
| `market` | TEXT | NOT NULL | 所属市场（SH/SZ） | "SH" |
| `industry` | TEXT | NULL | 所属行业 | "白酒" |
| `list_date` | TEXT | NOT NULL | 上市日期（YYYY-MM-DD） | "2001-08-27" |
| `market_cap` | REAL | NULL | 市值（亿元） | 25000.5 |
| `avg_turnover` | REAL | NULL | 日均成交额（万元） | 50000.0 |
| `status` | TEXT | NOT NULL | 准入状态（active/inactive） | "active" |
| `created_at` | TEXT | NOT NULL | 创建时间 | "2026-02-28T10:00:00Z" |
| `updated_at` | TEXT | NOT NULL | 更新时间 | "2026-02-28T10:00:00Z" |

**索引**:
- PRIMARY KEY: `stock_code`
- INDEX: `idx_stock_status` ON `(status)`
- INDEX: `idx_stock_market_cap` ON `(market_cap DESC)`

**业务规则**:
1. 准入标准（`status='active'`时满足）：
   - `market_cap > 50` 亿元
   - `avg_turnover > 1000` 万元
   - `stock_name NOT LIKE '%ST%'` （排除ST股）
   - 上市时间超过5年（`list_date < CURRENT_DATE - 5年`）
2. 每月重新评估准入标准，更新 `status` 字段
3. 不符合标准的股票标记为 `inactive`，但保留历史数据

---

### 2. KLineData（K线数据）

**描述**: 代表某个时间点的K线数据，支持日K和周K

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 自增主键 | 1 |
| `stock_code` | TEXT | NOT NULL, FOREIGN KEY | 股票代码 | "600519" |
| `date` | TEXT | NOT NULL | 交易日期（YYYY-MM-DD） | "2026-02-28" |
| `period` | TEXT | NOT NULL | K线周期（daily/weekly） | "daily" |
| `open` | REAL | NOT NULL | 开盘价 | 1850.00 |
| `high` | REAL | NOT NULL | 最高价 | 1880.50 |
| `low` | REAL | NOT NULL | 最低价 | 1845.00 |
| `close` | REAL | NOT NULL | 收盘价 | 1870.30 |
| `volume` | INTEGER | NOT NULL | 成交量（手） | 123456 |
| `turnover` | REAL | NOT NULL | 成交额（元） | 230000000.0 |
| `created_at` | TEXT | NOT NULL | 创建时间 | "2026-02-28T16:00:00Z" |

**索引**:
- PRIMARY KEY: `id`
- UNIQUE: `(stock_code, date, period)`
- INDEX: `idx_kline_stock_date` ON `(stock_code, date DESC)`
- INDEX: `idx_kline_date` ON `(date DESC)`
- INDEX: `idx_kline_period` ON `(period)`

**业务规则**:
1. 日K数据（`period='daily'`）：存储近20年历史数据（约5000条/股票）
2. 周K数据（`period='weekly'`）：基于日K数据计算生成，取每周第一个交易日的 `open`、最后一个交易日的 `close`、周内最高 `high`、最低 `low`、累计 `volume` 和 `turnover`
3. 数据来源：Tushare Pro（主）/ AkShare（备用），经过标准化处理
4. 每日定时批量更新（T+1日早上6点更新T日数据）
5. 用户手动触发更新时，重新获取最新交易日数据并覆盖

**关系**:
- `stock_code` REFERENCES `Stock(stock_code)` ON DELETE CASCADE

---

### 3. Indicator（技术指标）

**描述**: 代表计算出的技术指标数据

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 自增主键 | 1 |
| `stock_code` | TEXT | NOT NULL, FOREIGN KEY | 股票代码 | "600519" |
| `date` | TEXT | NOT NULL | 日期（YYYY-MM-DD） | "2026-02-28" |
| `period` | TEXT | NOT NULL | K线周期（daily/weekly） | "daily" |
| `indicator_type` | TEXT | NOT NULL | 指标类型 | "MA50" |
| `value` | REAL | NULL | 指标值（NULL表示数据不足无法计算） | 1820.55 |
| `created_at` | TEXT | NOT NULL | 创建时间 | "2026-02-28T18:00:00Z" |

**索引**:
- PRIMARY KEY: `id`
- UNIQUE: `(stock_code, date, period, indicator_type)`
- INDEX: `idx_indicator_stock_date_type` ON `(stock_code, date DESC, indicator_type)`
- INDEX: `idx_indicator_latest` ON `(date DESC, indicator_type, value)`（用于选股筛选）

**支持的指标类型**（`indicator_type` 枚举值）:

| indicator_type | 描述 | 计算参数 |
|----------------|------|----------|
| `MA50` | 日线50日均线 | period='daily' |
| `MA150` | 日线150日均线 | period='daily' |
| `MA200` | 日线200日均线 | period='daily' |
| `MA10` | 周线10周均线 | period='weekly' |
| `MA30` | 周线30周均线 | period='weekly' |
| `MA40` | 周线40周均线 | period='weekly' |
| `KDJ_K` | KDJ指标K值 | k=9, d=3, smooth_k=3 |
| `KDJ_D` | KDJ指标D值 | k=9, d=3, smooth_k=3 |
| `KDJ_J` | KDJ指标J值 | J=3K-2D |
| `RSI` | 相对强弱指标 | period=14 |
| `volume_ma52w` | 成交量52周均线 | window=260（日K） |
| `turnover_ma52w` | 成交额52周均线 | window=260（日K） |
| `high_52w` | 近52周最高点 | rolling max, window=260 |
| `low_52w` | 近52周最低点 | rolling min, window=260 |

**业务规则**:
1. 技术指标每日批量计算（使用 pandas-ta 库）
2. 计算时依赖足够的历史数据：
   - MA200: 需要至少200个交易日
   - 52周指标: 需要至少260个交易日（约1年）
   - 数据不足时，`value` 字段为 NULL
3. 用户手动触发更新时，重新计算所有指标并覆盖
4. 选股筛选时，只查询最新交易日的指标数据（优化查询性能）

**关系**:
- `stock_code` REFERENCES `Stock(stock_code)` ON DELETE CASCADE

---

### 4. User（用户）

**描述**: 代表使用工具的投资者，当前仅支持预设管理员账户

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `user_id` | TEXT | PRIMARY KEY | 用户ID（固定为"admin"） | "admin" |
| `username` | TEXT | NOT NULL UNIQUE | 用户名 | "admin" |
| `password_hash` | TEXT | NOT NULL | 密码哈希（bcrypt） | "$2b$12$..." |
| `created_at` | TEXT | NOT NULL | 创建时间 | "2026-02-28T08:00:00Z" |

**业务规则**:
1. 系统初始化时创建唯一管理员账户（`username='admin'`, `password='admin'`）
2. 密码使用 bcrypt 哈希存储，不明文保存
3. 登录后生成 JWT Token（有效期24小时），存储在 HttpOnly Cookie 中
4. 未来如需多用户支持，扩展此表即可

---

### 5. Favorite（收藏列表）

**描述**: 代表用户收藏的股票集合

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | 自增主键 | 1 |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | 用户ID | "admin" |
| `stock_code` | TEXT | NOT NULL, FOREIGN KEY | 股票代码 | "600519" |
| `group_name` | TEXT | NULL | 自定义分组名称 | "核心持仓" |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 排序顺序（数字越小越靠前） | 1 |
| `created_at` | TEXT | NOT NULL | 收藏时间 | "2026-02-28T10:30:00Z" |

**索引**:
- PRIMARY KEY: `id`
- UNIQUE: `(user_id, stock_code)`
- INDEX: `idx_favorite_user_sort` ON `(user_id, sort_order ASC)`

**业务规则**:
1. 用户可收藏多只股票，每只股票只能收藏一次
2. 支持自定义分组（`group_name`），同一分组内按 `sort_order` 排序
3. 用户可拖动调整收藏列表顺序（更新 `sort_order`）
4. 删除股票时，级联删除收藏记录

**关系**:
- `user_id` REFERENCES `User(user_id)` ON DELETE CASCADE
- `stock_code` REFERENCES `Stock(stock_code)` ON DELETE CASCADE

---

### 6. Strategy（选股策略）

**描述**: 代表用户保存的选股筛选方案

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `strategy_id` | TEXT | PRIMARY KEY | 策略ID（UUID） | "uuid-1234-..." |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | 用户ID | "admin" |
| `strategy_name` | TEXT | NOT NULL | 策略名称 | "超卖反弹策略" |
| `description` | TEXT | NULL | 策略描述 | "RSI超卖+KDJ金叉" |
| `created_at` | TEXT | NOT NULL | 创建时间 | "2026-02-28T11:00:00Z" |
| `updated_at` | TEXT | NOT NULL | 最后修改时间 | "2026-02-28T11:00:00Z" |

**索引**:
- PRIMARY KEY: `strategy_id`
- INDEX: `idx_strategy_user` ON `(user_id, created_at DESC)`

**业务规则**:
1. 策略名称不能为空，同一用户下策略名称可重复
2. 策略与筛选条件是 1:N 关系（一个策略包含多个条件）
3. 所有条件之间使用 AND 逻辑（取交集）
4. 条件数量不限制，但建议不超过10个（性能考虑）
5. 支持完整 CRUD 操作：创建、查看、编辑（修改名称和条件）、删除

**关系**:
- `user_id` REFERENCES `User(user_id)` ON DELETE CASCADE
- 1:N 关系：一个 Strategy 包含多个 FilterCondition

---

### 7. FilterCondition（筛选条件）

**描述**: 代表选股策略中的单个筛选条件

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `condition_id` | TEXT | PRIMARY KEY | 条件ID（UUID） | "uuid-5678-..." |
| `strategy_id` | TEXT | NOT NULL, FOREIGN KEY | 所属策略ID | "uuid-1234-..." |
| `condition_type` | TEXT | NOT NULL | 条件类型 | "indicator_value" |
| `indicator_name` | TEXT | NULL | 指标名称（condition_type=indicator_value时） | "RSI" |
| `operator` | TEXT | NOT NULL | 比较运算符 | "<" |
| `target_value` | REAL | NULL | 目标数值 | 30.0 |
| `pattern` | TEXT | NULL | 形态类型（condition_type=pattern时） | "kdj_golden_cross" |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 条件顺序 | 1 |

**索引**:
- PRIMARY KEY: `condition_id`
- INDEX: `idx_condition_strategy` ON `(strategy_id, sort_order ASC)`

**条件类型**（`condition_type` 枚举值）:

| condition_type | 描述 | 字段组合 | 示例 |
|----------------|------|----------|------|
| `indicator_value` | 指标数值比较 | `indicator_name`, `operator`, `target_value` | RSI < 30 |
| `pattern` | 指标形态 | `pattern` | KDJ金叉（当日） |
| `price_change` | 涨跌幅 | `operator`, `target_value` | 涨跌幅 > 5% |
| `volume_change` | 成交量变化 | `operator`, `target_value` | 成交量增长 > 50% |
| `week_52_high` | 创52周新高 | 无需额外字段 | 当前价格 = high_52w |
| `week_52_low` | 创52周新低 | 无需额外字段 | 当前价格 = low_52w |

**支持的运算符**（`operator` 枚举值）:
- `>`, `<`, `>=`, `<=`, `=`, `!=`

**支持的形态**（`pattern` 枚举值）:
- `kdj_golden_cross`: KDJ金叉（当日K线上穿D线）
- `kdj_death_cross`: KDJ死叉（当日K线下穿D线）
- `price_above_ma200`: 价格突破MA200（当日收盘价 > MA200）
- `price_below_ma200`: 价格跌破MA200（当日收盘价 < MA200）

**业务规则**:
1. 所有条件基于当日最新K线数据判断
2. 条件之间使用 AND 逻辑（取交集）
3. 形态判断逻辑：
   - KDJ金叉：`KDJ_K[t] > KDJ_D[t] AND KDJ_K[t-1] <= KDJ_D[t-1]`
   - KDJ死叉：`KDJ_K[t] < KDJ_D[t] AND KDJ_K[t-1] >= KDJ_D[t-1]`
4. 数据不足（指标值为NULL）的股票自动排除

**关系**:
- `strategy_id` REFERENCES `Strategy(strategy_id)` ON DELETE CASCADE

---

### 8. Drawing（绘图对象）

**描述**: 代表用户在图表上绘制的辅助线和标记

**字段**:

| 字段名 | 类型 | 约束 | 描述 | 示例值 |
|--------|------|------|------|--------|
| `drawing_id` | TEXT | PRIMARY KEY | 绘图ID（UUID） | "uuid-9012-..." |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | 用户ID | "admin" |
| `stock_code` | TEXT | NOT NULL, FOREIGN KEY | 股票代码 | "600519" |
| `drawing_type` | TEXT | NOT NULL | 绘图类型 | "trend_line" |
| `coordinates` | TEXT | NOT NULL | 坐标点JSON数组 | `[{"x":"2026-01-01","y":1800},{"x":"2026-02-01","y":1900}]` |
| `style_preset` | TEXT | NOT NULL | 预设样式名称 | "default" |
| `created_at` | TEXT | NOT NULL | 创建时间 | "2026-02-28T14:00:00Z" |

**索引**:
- PRIMARY KEY: `drawing_id`
- INDEX: `idx_drawing_user_stock` ON `(user_id, stock_code)`

**绘图类型**（`drawing_type` 枚举值）:

| drawing_type | 描述 | 坐标格式 | 示例 |
|--------------|------|----------|------|
| `trend_line` | 趋势线 | 2个点 `[{x, y}, {x, y}]` | 连接两个日期的价格点 |
| `horizontal_line` | 水平线 | 1个点 `[{y}]` | 标记支撑位/阻力位 |
| `vertical_line` | 垂直线 | 1个点 `[{x}]` | 标记重要日期 |
| `rectangle` | 矩形框 | 2个点 `[{x1, y1}, {x2, y2}]` | 标记盘整区域 |

**预设样式**（`style_preset` 枚举值）:
- `default`: 蓝色实线，线宽2px

**业务规则**:
1. 所有绘图对象使用统一预设样式（固定颜色和线宽），用户不能自定义样式
2. 坐标点存储为 JSON 字符串，`x` 为日期字符串（YYYY-MM-DD），`y` 为价格数值
3. 绘图对象与用户和股票关联，只在对应股票图表上显示
4. 用户刷新页面时，自动加载该股票的所有绘图对象
5. 支持删除绘图对象，不支持编辑（删除后重新绘制）

**关系**:
- `user_id` REFERENCES `User(user_id)` ON DELETE CASCADE
- `stock_code` REFERENCES `Stock(stock_code)` ON DELETE CASCADE

---

## 数据流

### 1. 数据初始化流程

```text
1. 运行 scripts/init_stocks.py
   ├─> 调用 Tushare Pro API 获取全部A股列表
   ├─> 应用准入标准筛选（市值、成交额、上市时间、ST股）
   └─> 写入 Stock 表（约1000只股票，status='active'）

2. 运行 scripts/fetch_kline_data.py
   ├─> 遍历 Stock 表中所有 active 股票
   ├─> 调用 DataSourceManager 获取近20年日K数据
   │   ├─> 优先 Tushare Pro
   │   └─> 失败时降级到 AkShare
   ├─> 写入 KLineData 表（period='daily'）
   └─> 基于日K数据计算周K，写入 KLineData 表（period='weekly'）

3. 运行 scripts/calculate_indicators.py
   ├─> 遍历 KLineData 表（按 stock_code 分组）
   ├─> 使用 pandas-ta 批量计算所有技术指标
   │   ├─> MA50, MA150, MA200（日K）
   │   ├─> MA10, MA30, MA40（周K）
   │   ├─> KDJ_K, KDJ_D, KDJ_J
   │   ├─> RSI
   │   ├─> volume_ma52w, turnover_ma52w
   │   └─> high_52w, low_52w
   └─> 写入 Indicator 表
```

### 2. 每日更新流程

```text
定时任务（APScheduler，每日早上6点）
└─> 运行 scripts/update_daily.py
    ├─> 1. 更新K线数据
    │   ├─> 调用 DataSourceManager 获取最新交易日数据
    │   └─> UPSERT 到 KLineData 表（覆盖已存在的记录）
    ├─> 2. 重新计算技术指标
    │   ├─> 基于更新后的K线数据
    │   └─> UPSERT 到 Indicator 表
    └─> 3. 重新评估准入标准（每月1号）
        ├─> 查询最新市值和成交额
        ├─> 更新 Stock 表 status 字段
        └─> 记录日志（新增/移除的股票）
```

### 3. 用户筛选流程

```text
用户设置筛选条件 → 执行筛选
└─> 1. 获取最新交易日期
    ├─> SELECT MAX(date) FROM kline_data WHERE period='daily'
    └─> latest_date = '2026-02-28'

└─> 2. 构建查询（多条件AND组合）
    ├─> 条件1: RSI < 30
    │   └─> SELECT stock_code FROM indicators 
    │       WHERE date='2026-02-28' AND indicator_type='RSI' AND value < 30
    ├─> 条件2: KDJ金叉
    │   └─> SELECT stock_code FROM indicators 
    │       WHERE date='2026-02-28' AND indicator_type='KDJ_K' AND value > (KDJ_D)
    │       AND date='2026-02-27' AND indicator_type='KDJ_K' AND value <= (KDJ_D)
    └─> 取交集：stock_codes = 条件1 ∩ 条件2 ∩ ... ∩ 条件N

└─> 3. 限制结果数量
    └─> LIMIT 100（如果结果 > 100，提示"结果过多，请优化筛选条件"）

└─> 4. 排序（用户可选）
    ├─> 按涨跌幅降序
    ├─> 按成交额降序
    ├─> 按市值降序
    └─> 按股票代码升序（默认）
```

---

## 状态转换

### Stock.status 状态机

```text
[初始化] ──应用准入标准──> [active]
                            │
                            │ 每月重新评估
                            │
              ┌─────────────┴─────────────┐
              │                           │
        仍符合标准                    不再符合标准
              │                           │
              ▼                           ▼
          [active]                    [inactive]
          （继续更新）                （停止更新，保留历史）
```

**转换规则**:
- `active → inactive`: 市值 < 50亿 OR 日均成交额 < 1000万 OR 变为ST股
- `inactive → active`: 重新符合所有准入标准（需连续评估3个月）

---

## 数据完整性约束

### 外键约束

```sql
-- KLineData 外键
ALTER TABLE kline_data 
ADD FOREIGN KEY (stock_code) REFERENCES stock(stock_code) ON DELETE CASCADE;

-- Indicator 外键
ALTER TABLE indicators 
ADD FOREIGN KEY (stock_code) REFERENCES stock(stock_code) ON DELETE CASCADE;

-- Favorite 外键
ALTER TABLE favorites 
ADD FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE favorites 
ADD FOREIGN KEY (stock_code) REFERENCES stock(stock_code) ON DELETE CASCADE;

-- Strategy 外键
ALTER TABLE strategies 
ADD FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- FilterCondition 外键
ALTER TABLE filter_conditions 
ADD FOREIGN KEY (strategy_id) REFERENCES strategies(strategy_id) ON DELETE CASCADE;

-- Drawing 外键
ALTER TABLE drawings 
ADD FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE drawings 
ADD FOREIGN KEY (stock_code) REFERENCES stock(stock_code) ON DELETE CASCADE;
```

### 唯一性约束

```sql
-- 防止重复K线数据
UNIQUE(stock_code, date, period)

-- 防止重复指标数据
UNIQUE(stock_code, date, period, indicator_type)

-- 防止重复收藏
UNIQUE(user_id, stock_code)

-- 防止重复用户
UNIQUE(username)
```

---

## 数据量估算

| 实体 | 记录数量 | 单条记录大小 | 总大小估算 |
|------|---------|-------------|-----------|
| Stock | 1,000 | ~500 bytes | 0.5 MB |
| KLineData (日K) | 1,000 × 5,000 = 5,000,000 | ~150 bytes | 750 MB |
| KLineData (周K) | 1,000 × 1,000 = 1,000,000 | ~150 bytes | 150 MB |
| Indicator | 5,000,000 × 14指标 = 70,000,000 | ~100 bytes | 7 GB |
| User | 1 | ~200 bytes | <1 KB |
| Favorite | <100 | ~100 bytes | <10 KB |
| Strategy | <50 | ~300 bytes | <15 KB |
| FilterCondition | <500 | ~200 bytes | <100 KB |
| Drawing | <1,000 | ~500 bytes | <500 KB |
| **总计** | | | **约 8 GB** |

**注**: 
- 加上 SQLite 索引和元数据，实际存储空间预估 **12-15 GB**
- 单个 SQLite 文件理论上限 281 TB，8 GB 远未达到限制
- WAL 模式下，额外需要约 1-2 GB 的临时空间

---

## 数据验证规则

### 输入验证

| 字段 | 验证规则 |
|------|---------|
| `stock_code` | 正则：`^[0-9]{6}$` |
| `date` | 格式：`YYYY-MM-DD`，范围：`>= 2005-01-01 AND <= CURRENT_DATE` |
| `period` | 枚举：`daily`, `weekly` |
| `indicator_type` | 枚举：见上文支持的指标类型 |
| `operator` | 枚举：`>`, `<`, `>=`, `<=`, `=`, `!=` |
| `drawing_type` | 枚举：`trend_line`, `horizontal_line`, `vertical_line`, `rectangle` |
| `coordinates` | JSON 格式，包含 `x`（日期）和 `y`（数值） |

### 业务验证

- K线数据：`open`, `high`, `low`, `close` 必须 > 0，`high >= max(open, close, low)`，`low <= min(open, close, high)`
- 技术指标：RSI 范围 [0, 100]，KDJ 范围理论上 [0, 100] 但可能超出
- 筛选条件：`target_value` 必须为有效数值（不能为 NaN 或 Infinity）
- 绘图对象：坐标点中的日期必须在股票上市日期之后

---

## 数据迁移策略

### 版本控制

使用 Alembic 管理数据库迁移（如需要）：

```bash
# 创建迁移脚本
alembic revision -m "add_new_indicator_type"

# 应用迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

### 备份策略

1. **每日备份**：定时任务（凌晨2点）备份 SQLite 文件到本地目录
2. **增量备份**：使用 SQLite WAL 模式，定期 checkpoint 刷新到主文件
3. **云备份**：每周上传备份文件到云存储（可选）

---

**Phase 1 数据模型设计完成**，下一步：创建 API 契约（contracts/）
