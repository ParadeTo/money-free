# REST API 契约

**项目**: 股票分析工具  
**日期**: 2026-02-28  
**Base URL**: `http://localhost:8000/api/v1`  
**认证方式**: JWT Token (HttpOnly Cookie)

---

## 目录

1. [认证接口](#1-认证接口)
2. [股票接口](#2-股票接口)
3. [K线数据接口](#3-k线数据接口)
4. [技术指标接口](#4-技术指标接口)
5. [选股筛选接口](#5-选股筛选接口)
6. [策略管理接口](#6-策略管理接口)
7. [收藏管理接口](#7-收藏管理接口)
8. [绘图对象接口](#8-绘图对象接口)
9. [通用响应格式](#9-通用响应格式)
10. [错误代码](#10-错误代码)

---

## 1. 认证接口

### 1.1 用户登录

**Endpoint**: `POST /auth/login`

**描述**: 使用预设管理员账户登录，返回 JWT Token（存储在 HttpOnly Cookie）

**请求体**:
```json
{
  "username": "admin",
  "password": "admin"
}
```

**响应** (200 OK):
```json
{
  "message": "登录成功",
  "user": {
    "user_id": "admin",
    "username": "admin"
  }
}
```

**响应** (401 Unauthorized):
```json
{
  "detail": "账户名或密码错误,请重试"
}
```

**Set-Cookie**:
```
access_token=<JWT_TOKEN>; HttpOnly; Max-Age=86400; SameSite=Lax; Path=/
```

---

### 1.2 用户退出

**Endpoint**: `POST /auth/logout`

**描述**: 清除用户会话，删除 JWT Cookie

**认证**: Required

**响应** (200 OK):
```json
{
  "message": "退出成功"
}
```

**Set-Cookie**:
```
access_token=; HttpOnly; Max-Age=0; Path=/
```

---

### 1.3 获取当前用户信息

**Endpoint**: `GET /auth/me`

**描述**: 获取当前登录用户信息

**认证**: Required

**响应** (200 OK):
```json
{
  "user_id": "admin",
  "username": "admin",
  "created_at": "2026-02-28T08:00:00Z"
}
```

**响应** (401 Unauthorized):
```json
{
  "detail": "登录已过期，请重新登录"
}
```

---

## 2. 股票接口

### 2.1 搜索股票

**Endpoint**: `GET /stocks/search`

**描述**: 按股票代码或名称搜索股票

**认证**: Required

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `q` | string | 是 | 搜索关键词（股票代码或名称） | "600519" 或 "茅台" |
| `limit` | integer | 否 | 返回数量限制（默认20） | 20 |

**响应** (200 OK):
```json
{
  "results": [
    {
      "stock_code": "600519",
      "stock_name": "贵州茅台",
      "market": "SH",
      "industry": "白酒",
      "market_cap": 25000.5,
      "status": "active"
    }
  ],
  "total": 1
}
```

---

### 2.2 获取股票详情

**Endpoint**: `GET /stocks/{stock_code}`

**描述**: 获取单只股票的详细信息

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `stock_code` | string | 股票代码（6位数字） | "600519" |

**响应** (200 OK):
```json
{
  "stock_code": "600519",
  "stock_name": "贵州茅台",
  "market": "SH",
  "industry": "白酒",
  "list_date": "2001-08-27",
  "market_cap": 25000.5,
  "avg_turnover": 50000.0,
  "status": "active",
  "latest_price": 1870.30,
  "price_change": 2.5,
  "price_change_percent": 0.13
}
```

**响应** (404 Not Found):
```json
{
  "detail": "未找到该股票"
}
```

---

### 2.3 获取股票列表

**Endpoint**: `GET /stocks`

**描述**: 获取符合准入标准的股票列表（分页）

**认证**: Required

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `page` | integer | 否 | 页码（从1开始，默认1） | 1 |
| `page_size` | integer | 否 | 每页数量（默认50，最大100） | 50 |
| `status` | string | 否 | 筛选状态（active/inactive，默认active） | "active" |

**响应** (200 OK):
```json
{
  "stocks": [
    {
      "stock_code": "600519",
      "stock_name": "贵州茅台",
      "market": "SH",
      "industry": "白酒",
      "market_cap": 25000.5,
      "status": "active"
    }
  ],
  "total": 1000,
  "page": 1,
  "page_size": 50,
  "total_pages": 20
}
```

---

## 3. K线数据接口

### 3.1 获取K线数据

**Endpoint**: `GET /klines/{stock_code}`

**描述**: 获取指定股票的K线数据（日K或周K）

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `stock_code` | string | 股票代码 | "600519" |

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `period` | string | 否 | K线周期（daily/weekly，默认daily） | "daily" |
| `start_date` | string | 否 | 开始日期（YYYY-MM-DD，默认20年前） | "2024-01-01" |
| `end_date` | string | 否 | 结束日期（YYYY-MM-DD，默认今天） | "2026-02-28" |

**响应** (200 OK):
```json
{
  "stock_code": "600519",
  "period": "daily",
  "data": [
    {
      "date": "2026-02-28",
      "open": 1850.00,
      "high": 1880.50,
      "low": 1845.00,
      "close": 1870.30,
      "volume": 123456,
      "turnover": 230000000.0
    },
    {
      "date": "2026-02-27",
      "open": 1840.00,
      "high": 1855.00,
      "low": 1835.00,
      "close": 1850.00,
      "volume": 110000,
      "turnover": 203500000.0
    }
  ],
  "count": 2
}
```

**响应** (400 Bad Request):
```json
{
  "detail": "当前仅支持日K和周K查看"
}
```

---

### 3.2 手动触发数据更新

**Endpoint**: `POST /klines/{stock_code}/refresh`

**描述**: 手动触发指定股票的K线数据和技术指标更新

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `stock_code` | string | 股票代码 | "600519" |

**响应** (200 OK):
```json
{
  "message": "数据更新成功",
  "stock_code": "600519",
  "updated_records": {
    "kline_data": 1,
    "indicators": 14
  }
}
```

**响应** (503 Service Unavailable):
```json
{
  "detail": "数据加载失败，请稍后重试"
}
```

---

## 4. 技术指标接口

### 4.1 获取技术指标数据

**Endpoint**: `GET /indicators/{stock_code}`

**描述**: 获取指定股票的技术指标数据

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `stock_code` | string | 股票代码 | "600519" |

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `period` | string | 否 | K线周期（daily/weekly，默认daily） | "daily" |
| `indicator_types` | string | 否 | 指标类型（逗号分隔，默认全部） | "MA50,MA150,RSI" |
| `start_date` | string | 否 | 开始日期（YYYY-MM-DD） | "2024-01-01" |
| `end_date` | string | 否 | 结束日期（YYYY-MM-DD） | "2026-02-28" |

**响应** (200 OK):
```json
{
  "stock_code": "600519",
  "period": "daily",
  "indicators": {
    "MA50": [
      {"date": "2026-02-28", "value": 1820.55},
      {"date": "2026-02-27", "value": 1818.30}
    ],
    "MA150": [
      {"date": "2026-02-28", "value": 1750.20},
      {"date": "2026-02-27", "value": 1748.50}
    ],
    "RSI": [
      {"date": "2026-02-28", "value": 65.5},
      {"date": "2026-02-27", "value": 63.2}
    ]
  },
  "count": 2
}
```

**响应** (400 Bad Request):
```json
{
  "detail": "数据不足，无法计算该指标"
}
```

---

### 4.2 获取52周高低点标注

**Endpoint**: `GET /indicators/{stock_code}/week52-markers`

**描述**: 获取近52周最高点和最低点标注数据（用于图表标记）

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `stock_code` | string | 股票代码 | "600519" |

**响应** (200 OK):
```json
{
  "stock_code": "600519",
  "high_52w": {
    "date": "2026-01-15",
    "value": 1950.00,
    "label": "52周最高"
  },
  "low_52w": {
    "date": "2025-08-20",
    "value": 1650.00,
    "label": "52周最低"
  },
  "current_price": 1870.30,
  "current_date": "2026-02-28"
}
```

**响应** (400 Bad Request):
```json
{
  "detail": "上市时间不足1年，暂无52周高低点"
}
```

---

## 5. 选股筛选接口

### 5.1 执行筛选

**Endpoint**: `POST /filters/execute`

**描述**: 根据筛选条件执行选股，返回符合条件的股票列表（最多100只）

**认证**: Required

**请求体**:
```json
{
  "conditions": [
    {
      "condition_type": "indicator_value",
      "indicator_name": "RSI",
      "operator": "<",
      "target_value": 30.0
    },
    {
      "condition_type": "pattern",
      "pattern": "kdj_golden_cross"
    },
    {
      "condition_type": "volume_change",
      "operator": ">",
      "target_value": 50.0
    }
  ],
  "sort_by": "price_change_percent",
  "sort_order": "desc"
}
```

**请求体字段说明**:
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `conditions` | array | 是 | 筛选条件数组（AND逻辑组合，数量不限） |
| `sort_by` | string | 否 | 排序字段（stock_code/price_change_percent/turnover/market_cap，默认stock_code） |
| `sort_order` | string | 否 | 排序方向（asc/desc，默认asc） |

**条件对象格式**:
```typescript
// 指标数值比较
{
  condition_type: "indicator_value",
  indicator_name: "RSI" | "MA50" | "MA150" | "MA200" | "KDJ_K" | "KDJ_D" | "KDJ_J",
  operator: ">" | "<" | ">=" | "<=" | "=" | "!=",
  target_value: number
}

// 指标形态
{
  condition_type: "pattern",
  pattern: "kdj_golden_cross" | "kdj_death_cross" | "price_above_ma200" | "price_below_ma200"
}

// 涨跌幅
{
  condition_type: "price_change",
  operator: ">" | "<" | ">=" | "<=",
  target_value: number  // 百分比，如5表示5%
}

// 成交量变化
{
  condition_type: "volume_change",
  operator: ">" | "<" | ">=" | "<=",
  target_value: number  // 百分比，如50表示增长50%
}

// 创52周新高/新低
{
  condition_type: "week_52_high" | "week_52_low"
}
```

**响应** (200 OK):
```json
{
  "results": [
    {
      "stock_code": "600519",
      "stock_name": "贵州茅台",
      "market": "SH",
      "industry": "白酒",
      "latest_price": 1870.30,
      "price_change": 2.5,
      "price_change_percent": 0.13,
      "volume": 123456,
      "turnover": 230000000.0,
      "market_cap": 25000.5,
      "matched_conditions": 3
    }
  ],
  "total": 1,
  "is_truncated": false,
  "message": null
}
```

**响应** (200 OK - 结果过多):
```json
{
  "results": [...],  // 前100个结果
  "total": 150,
  "is_truncated": true,
  "message": "结果过多（超过100只），仅显示前100个，请优化筛选条件以获得更精准的结果"
}
```

**响应** (200 OK - 无结果):
```json
{
  "results": [],
  "total": 0,
  "is_truncated": false,
  "message": "未找到符合条件的股票，请调整筛选条件"
}
```

**响应** (400 Bad Request):
```json
{
  "detail": "筛选条件格式错误：缺少必填字段 'condition_type'"
}
```

---

## 6. 策略管理接口

### 6.1 创建策略

**Endpoint**: `POST /strategies`

**描述**: 创建新的选股策略

**认证**: Required

**请求体**:
```json
{
  "strategy_name": "超卖反弹策略",
  "description": "RSI超卖+KDJ金叉",
  "conditions": [
    {
      "condition_type": "indicator_value",
      "indicator_name": "RSI",
      "operator": "<",
      "target_value": 30.0
    },
    {
      "condition_type": "pattern",
      "pattern": "kdj_golden_cross"
    }
  ]
}
```

**响应** (201 Created):
```json
{
  "strategy_id": "uuid-1234-5678-90ab-cdef",
  "strategy_name": "超卖反弹策略",
  "description": "RSI超卖+KDJ金叉",
  "user_id": "admin",
  "conditions": [
    {
      "condition_id": "uuid-cond-1",
      "condition_type": "indicator_value",
      "indicator_name": "RSI",
      "operator": "<",
      "target_value": 30.0,
      "sort_order": 1
    },
    {
      "condition_id": "uuid-cond-2",
      "condition_type": "pattern",
      "pattern": "kdj_golden_cross",
      "sort_order": 2
    }
  ],
  "created_at": "2026-02-28T11:00:00Z",
  "updated_at": "2026-02-28T11:00:00Z"
}
```

---

### 6.2 获取策略列表

**Endpoint**: `GET /strategies`

**描述**: 获取当前用户的所有策略列表

**认证**: Required

**响应** (200 OK):
```json
{
  "strategies": [
    {
      "strategy_id": "uuid-1234-5678-90ab-cdef",
      "strategy_name": "超卖反弹策略",
      "description": "RSI超卖+KDJ金叉",
      "condition_count": 2,
      "created_at": "2026-02-28T11:00:00Z",
      "updated_at": "2026-02-28T11:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 6.3 获取策略详情

**Endpoint**: `GET /strategies/{strategy_id}`

**描述**: 获取单个策略的详细信息（包含所有筛选条件）

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `strategy_id` | string | 策略ID（UUID） | "uuid-1234-..." |

**响应** (200 OK):
```json
{
  "strategy_id": "uuid-1234-5678-90ab-cdef",
  "strategy_name": "超卖反弹策略",
  "description": "RSI超卖+KDJ金叉",
  "user_id": "admin",
  "conditions": [
    {
      "condition_id": "uuid-cond-1",
      "condition_type": "indicator_value",
      "indicator_name": "RSI",
      "operator": "<",
      "target_value": 30.0,
      "sort_order": 1
    },
    {
      "condition_id": "uuid-cond-2",
      "condition_type": "pattern",
      "pattern": "kdj_golden_cross",
      "sort_order": 2
    }
  ],
  "created_at": "2026-02-28T11:00:00Z",
  "updated_at": "2026-02-28T11:00:00Z"
}
```

**响应** (404 Not Found):
```json
{
  "detail": "策略不存在或无权访问"
}
```

---

### 6.4 编辑策略

**Endpoint**: `PUT /strategies/{strategy_id}`

**描述**: 编辑策略（修改名称、描述、筛选条件）

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `strategy_id` | string | 策略ID（UUID） | "uuid-1234-..." |

**请求体**:
```json
{
  "strategy_name": "超卖反弹策略v2",
  "description": "RSI超卖+KDJ金叉+成交量放大",
  "conditions": [
    {
      "condition_type": "indicator_value",
      "indicator_name": "RSI",
      "operator": "<",
      "target_value": 35.0
    },
    {
      "condition_type": "pattern",
      "pattern": "kdj_golden_cross"
    },
    {
      "condition_type": "volume_change",
      "operator": ">",
      "target_value": 50.0
    }
  ]
}
```

**响应** (200 OK):
```json
{
  "strategy_id": "uuid-1234-5678-90ab-cdef",
  "strategy_name": "超卖反弹策略v2",
  "description": "RSI超卖+KDJ金叉+成交量放大",
  "user_id": "admin",
  "conditions": [...],  // 更新后的条件
  "created_at": "2026-02-28T11:00:00Z",
  "updated_at": "2026-02-28T12:30:00Z"
}
```

---

### 6.5 删除策略

**Endpoint**: `DELETE /strategies/{strategy_id}`

**描述**: 删除策略（级联删除所有筛选条件）

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `strategy_id` | string | 策略ID（UUID） | "uuid-1234-..." |

**响应** (200 OK):
```json
{
  "message": "策略删除成功",
  "strategy_id": "uuid-1234-5678-90ab-cdef"
}
```

---

### 6.6 执行策略筛选

**Endpoint**: `POST /strategies/{strategy_id}/execute`

**描述**: 使用保存的策略执行筛选

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `strategy_id` | string | 策略ID（UUID） | "uuid-1234-..." |

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `sort_by` | string | 否 | 排序字段（默认stock_code） | "price_change_percent" |
| `sort_order` | string | 否 | 排序方向（默认asc） | "desc" |

**响应** (200 OK):
```json
{
  "strategy_name": "超卖反弹策略",
  "results": [...],  // 同 /filters/execute 响应格式
  "total": 5,
  "is_truncated": false,
  "message": null
}
```

---

## 7. 收藏管理接口

### 7.1 添加收藏

**Endpoint**: `POST /favorites`

**描述**: 添加股票到收藏列表

**认证**: Required

**请求体**:
```json
{
  "stock_code": "600519",
  "group_name": "核心持仓"
}
```

**响应** (201 Created):
```json
{
  "id": 1,
  "user_id": "admin",
  "stock_code": "600519",
  "stock_name": "贵州茅台",
  "group_name": "核心持仓",
  "sort_order": 1,
  "created_at": "2026-02-28T10:30:00Z"
}
```

**响应** (409 Conflict):
```json
{
  "detail": "股票已在收藏列表中"
}
```

---

### 7.2 获取收藏列表

**Endpoint**: `GET /favorites`

**描述**: 获取当前用户的收藏列表

**认证**: Required

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `group_name` | string | 否 | 筛选分组（为空则返回全部） | "核心持仓" |

**响应** (200 OK):
```json
{
  "favorites": [
    {
      "id": 1,
      "stock_code": "600519",
      "stock_name": "贵州茅台",
      "group_name": "核心持仓",
      "sort_order": 1,
      "latest_price": 1870.30,
      "price_change": 2.5,
      "price_change_percent": 0.13,
      "created_at": "2026-02-28T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### 7.3 更新收藏排序

**Endpoint**: `PUT /favorites/{favorite_id}/sort`

**描述**: 更新收藏项的排序顺序

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `favorite_id` | integer | 收藏记录ID | 1 |

**请求体**:
```json
{
  "sort_order": 5
}
```

**响应** (200 OK):
```json
{
  "message": "排序更新成功",
  "favorite_id": 1,
  "sort_order": 5
}
```

---

### 7.4 取消收藏

**Endpoint**: `DELETE /favorites/{favorite_id}`

**描述**: 从收藏列表中移除股票

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `favorite_id` | integer | 收藏记录ID | 1 |

**响应** (200 OK):
```json
{
  "message": "取消收藏成功",
  "favorite_id": 1
}
```

---

## 8. 绘图对象接口

### 8.1 创建绘图对象

**Endpoint**: `POST /drawings`

**描述**: 在图表上创建新的绘图对象（趋势线、水平线等）

**认证**: Required

**请求体**:
```json
{
  "stock_code": "600519",
  "drawing_type": "trend_line",
  "coordinates": [
    {"x": "2026-01-15", "y": 1800.0},
    {"x": "2026-02-28", "y": 1900.0}
  ]
}
```

**响应** (201 Created):
```json
{
  "drawing_id": "uuid-draw-1234",
  "user_id": "admin",
  "stock_code": "600519",
  "drawing_type": "trend_line",
  "coordinates": [
    {"x": "2026-01-15", "y": 1800.0},
    {"x": "2026-02-28", "y": 1900.0}
  ],
  "style_preset": "default",
  "created_at": "2026-02-28T14:00:00Z"
}
```

**响应** (400 Bad Request):
```json
{
  "detail": "坐标格式错误：趋势线需要2个点"
}
```

---

### 8.2 获取绘图对象列表

**Endpoint**: `GET /drawings`

**描述**: 获取指定股票的所有绘图对象

**认证**: Required

**查询参数**:
| 参数 | 类型 | 必填 | 描述 | 示例 |
|------|------|------|------|------|
| `stock_code` | string | 是 | 股票代码 | "600519" |

**响应** (200 OK):
```json
{
  "stock_code": "600519",
  "drawings": [
    {
      "drawing_id": "uuid-draw-1234",
      "drawing_type": "trend_line",
      "coordinates": [
        {"x": "2026-01-15", "y": 1800.0},
        {"x": "2026-02-28", "y": 1900.0}
      ],
      "style_preset": "default",
      "created_at": "2026-02-28T14:00:00Z"
    },
    {
      "drawing_id": "uuid-draw-5678",
      "drawing_type": "horizontal_line",
      "coordinates": [{"y": 1850.0}],
      "style_preset": "default",
      "created_at": "2026-02-28T14:15:00Z"
    }
  ],
  "total": 2
}
```

---

### 8.3 删除绘图对象

**Endpoint**: `DELETE /drawings/{drawing_id}`

**描述**: 删除指定的绘图对象

**认证**: Required

**路径参数**:
| 参数 | 类型 | 描述 | 示例 |
|------|------|------|------|
| `drawing_id` | string | 绘图对象ID（UUID） | "uuid-draw-1234" |

**响应** (200 OK):
```json
{
  "message": "绘图对象删除成功",
  "drawing_id": "uuid-draw-1234"
}
```

---

## 9. 通用响应格式

### 成功响应

所有成功的响应都遵循以下格式：

```json
{
  // 业务数据字段（根据接口不同而变化）
  "data_field_1": "value1",
  "data_field_2": "value2"
}
```

### 错误响应

所有错误响应都遵循 FastAPI 标准格式：

```json
{
  "detail": "错误描述信息"
}
```

---

## 10. 错误代码

| HTTP 状态码 | 错误场景 | 示例响应 |
|------------|---------|---------|
| **400 Bad Request** | 请求参数格式错误 | `{"detail": "筛选条件格式错误"}` |
| **401 Unauthorized** | 未登录或会话过期 | `{"detail": "登录已过期，请重新登录"}` |
| **403 Forbidden** | 无权访问资源 | `{"detail": "无权访问该策略"}` |
| **404 Not Found** | 资源不存在 | `{"detail": "未找到该股票"}` |
| **409 Conflict** | 资源冲突 | `{"detail": "股票已在收藏列表中"}` |
| **422 Unprocessable Entity** | 数据验证失败 | `{"detail": "股票代码格式错误"}` |
| **500 Internal Server Error** | 服务器内部错误 | `{"detail": "服务器错误，请稍后重试"}` |
| **503 Service Unavailable** | 数据源不可用 | `{"detail": "数据加载失败，请稍后重试"}` |

---

## 附录：TypeScript 类型定义

```typescript
// Stock
interface Stock {
  stock_code: string;
  stock_name: string;
  market: "SH" | "SZ";
  industry: string | null;
  list_date: string;  // YYYY-MM-DD
  market_cap: number;  // 亿元
  avg_turnover: number;  // 万元
  status: "active" | "inactive";
  latest_price?: number;
  price_change?: number;
  price_change_percent?: number;
}

// KLineData
interface KLineData {
  date: string;  // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

// Indicator
interface IndicatorData {
  date: string;
  value: number | null;
}

interface IndicatorsResponse {
  stock_code: string;
  period: "daily" | "weekly";
  indicators: {
    [indicatorType: string]: IndicatorData[];
  };
  count: number;
}

// FilterCondition
type FilterCondition = 
  | { condition_type: "indicator_value"; indicator_name: string; operator: string; target_value: number; }
  | { condition_type: "pattern"; pattern: string; }
  | { condition_type: "price_change"; operator: string; target_value: number; }
  | { condition_type: "volume_change"; operator: string; target_value: number; }
  | { condition_type: "week_52_high" | "week_52_low"; };

// Strategy
interface Strategy {
  strategy_id: string;
  strategy_name: string;
  description: string | null;
  user_id: string;
  conditions: FilterConditionDetail[];
  created_at: string;
  updated_at: string;
}

interface FilterConditionDetail extends FilterCondition {
  condition_id: string;
  sort_order: number;
}

// Favorite
interface Favorite {
  id: number;
  stock_code: string;
  stock_name: string;
  group_name: string | null;
  sort_order: number;
  latest_price?: number;
  price_change?: number;
  price_change_percent?: number;
  created_at: string;
}

// Drawing
interface Drawing {
  drawing_id: string;
  user_id: string;
  stock_code: string;
  drawing_type: "trend_line" | "horizontal_line" | "vertical_line" | "rectangle";
  coordinates: Array<{ x?: string; y?: number }>;
  style_preset: "default";
  created_at: string;
}
```

---

**契约版本**: v1.0  
**最后更新**: 2026-02-28  
**变更日志**: 初始版本
