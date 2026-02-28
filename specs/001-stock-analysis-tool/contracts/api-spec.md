# API 接口规范

**功能**: 股票分析工具  
**日期**: 2026-02-28  
**状态**: Phase 1 - API 契约设计

## 概述

本文档定义股票分析工具后端 API 的接口规范，采用 RESTful 风格，所有请求和响应使用 JSON 格式。

**Base URL**: `/api/v1`

---

## 认证

### POST `/auth/login`

**描述**: 用户登录

**请求体**:
```typescript
{
  username: string;  // "admin"
  password: string;  // "admin"
}
```

**响应** (200 OK):
```typescript
{
  access_token: string;
  token_type: "bearer";
  user: {
    id: number;
    username: string;
  };
}
```

**错误响应** (401 Unauthorized):
```typescript
{
  detail: "账户名或密码错误";
}
```

---

### POST `/auth/logout`

**描述**: 用户登出

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应** (200 OK):
```typescript
{
  message: "登出成功";
}
```

---

### GET `/auth/me`

**描述**: 获取当前用户信息

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应** (200 OK):
```typescript
{
  id: number;
  username: string;
  preferences: {
    default_period?: "daily" | "weekly";
    default_indicators?: string[];
    chart_theme?: "light" | "dark";
  };
  created_at: string;  // ISO 8601
  last_login_at?: string;
}
```

---

## 股票管理

### GET `/stocks`

**描述**: 获取股票列表 (支持搜索和分页)

**查询参数**:
```typescript
{
  search?: string;      // 股票代码或名称，模糊搜索
  market?: "SH" | "SZ"; // 市场筛选
  status?: "active" | "suspended" | "delisted";
  page?: number;        // 页码，默认1
  page_size?: number;   // 每页数量，默认20，最大100
}
```

**响应** (200 OK):
```typescript
{
  total: number;
  page: number;
  page_size: number;
  items: Array<{
    code: string;
    name: string;
    market: "SH" | "SZ";
    industry?: string;
    list_date: string;  // YYYY-MM-DD
    status: "active" | "suspended" | "delisted";
  }>;
}
```

---

### GET `/stocks/{code}`

**描述**: 获取单个股票详情

**路径参数**:
- `code`: 股票代码 (如 "600519")

**响应** (200 OK):
```typescript
{
  code: string;
  name: string;
  market: "SH" | "SZ";
  industry?: string;
  list_date: string;
  status: "active" | "suspended" | "delisted";
  latest_price?: {
    date: string;
    close: number;
    change: number;       // 涨跌额
    change_percent: number; // 涨跌幅 %
  };
}
```

**错误响应** (404 Not Found):
```typescript
{
  detail: "未找到该股票";
}
```

---

## K线数据

### GET `/stocks/{code}/klines`

**描述**: 获取股票K线数据

**路径参数**:
- `code`: 股票代码

**查询参数**:
```typescript
{
  period: "daily" | "weekly";  // 必填
  start_date?: string;         // YYYY-MM-DD，默认最近1年
  end_date?: string;           // YYYY-MM-DD，默认今天
  limit?: number;              // 最多返回条数，默认500，最大2000
}
```

**响应** (200 OK):
```typescript
{
  stock_code: string;
  period: "daily" | "weekly";
  data: Array<{
    date: string;  // YYYY-MM-DD
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
  }>;
  count: number;
}
```

---

## 技术指标

### GET `/stocks/{code}/indicators`

**描述**: 获取股票技术指标数据

**路径参数**:
- `code`: 股票代码

**查询参数**:
```typescript
{
  period: "daily" | "weekly";  // 必填
  indicators: string;          // 必填，逗号分隔，如 "MA,KDJ,RSI,VOLUME"
  start_date?: string;         // YYYY-MM-DD
  end_date?: string;           // YYYY-MM-DD
  limit?: number;              // 默认500
}
```

**响应** (200 OK):
```typescript
{
  stock_code: string;
  period: "daily" | "weekly";
  indicators: {
    [date: string]: {  // YYYY-MM-DD
      MA?: {
        // 日K线: ma50, ma150, ma200
        // 周K线: ma10, ma30, ma40
        ma50?: number;    // 仅日K
        ma150?: number;   // 仅日K
        ma200?: number;   // 仅日K
        ma10?: number;    // 仅周K
        ma30?: number;    // 仅周K
        ma40?: number;    // 仅周K
      };
      KDJ?: {
        k: number;
        d: number;
        j: number;
      };
      RSI?: {
        rsi: number;
      };
      VOLUME?: {
        volume: number;
        volume_ma52w: number;  // 52周均量
      };
      AMOUNT?: {
        amount: number;
        amount_ma52w: number;  // 52周均额
      };
      WEEK52_HIGHLOW?: {
        high_52w: number;
        high_52w_date: string;
        low_52w: number;
        low_52w_date: string;
      };
    };
  };
}
```

---

### POST `/stocks/update`

**描述**: 手动触发数据更新 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```typescript
{
  stock_codes?: string[];  // 可选，指定股票代码列表，不传则更新全部
}
```

**响应** (202 Accepted):
```typescript
{
  message: "数据更新任务已启动";
  task_id: string;
}
```

---

### GET `/stocks/update/{task_id}/status`

**描述**: 查询数据更新任务状态

**路径参数**:
- `task_id`: 任务ID

**响应** (200 OK):
```typescript
{
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;    // 0-100
  message?: string;
  started_at: string;
  completed_at?: string;
}
```

---

## 选股筛选

### POST `/screener/run`

**描述**: 执行选股筛选 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```typescript
{
  conditions: Array<{
    indicator: string;     // "RSI", "volume_change", "price_change" 等
    operator: "<" | ">" | "=" | "<=" | ">=";
    value: number;
    period?: "daily" | "weekly";  // 默认 daily
  }>;
  logic: "AND" | "OR";  // 默认 AND
  limit?: number;       // 默认100，最大100
}
```

**响应** (200 OK):
```typescript
{
  total: number;         // 总匹配数 (可能超过100)
  returned: number;      // 实际返回数 (最多100)
  is_truncated: boolean; // 是否被截断
  results: Array<{
    stock_code: string;
    stock_name: string;
    current_price: number;
    change_percent: number;
    matched_conditions: string[];  // 匹配的条件描述
  }>;
}
```

---

### GET `/screener/templates`

**描述**: 获取用户的筛选方案列表 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应** (200 OK):
```typescript
{
  templates: Array<{
    id: number;
    name: string;
    conditions: {
      conditions: Array<...>;
      logic: "AND" | "OR";
    };
    created_at: string;
    updated_at: string;
  }>;
}
```

---

### POST `/screener/templates`

**描述**: 保存筛选方案 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```typescript
{
  name: string;
  conditions: {
    conditions: Array<...>;
    logic: "AND" | "OR";
  };
}
```

**响应** (201 Created):
```typescript
{
  id: number;
  name: string;
  conditions: {...};
  created_at: string;
}
```

---

### DELETE `/screener/templates/{id}`

**描述**: 删除筛选方案 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应** (200 OK):
```typescript
{
  message: "筛选方案已删除";
}
```

---

## 收藏管理

### GET `/favorites`

**描述**: 获取用户收藏列表 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
```typescript
{
  group?: string;  // 按分组筛选
}
```

**响应** (200 OK):
```typescript
{
  favorites: Array<{
    id: number;
    stock_code: string;
    stock_name: string;
    group_name?: string;
    sort_order: number;
    latest_price: {
      close: number;
      change_percent: number;
    };
    created_at: string;
  }>;
}
```

---

### POST `/favorites`

**描述**: 添加收藏 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```typescript
{
  stock_code: string;
  group_name?: string;
}
```

**响应** (201 Created):
```typescript
{
  id: number;
  stock_code: string;
  group_name?: string;
  sort_order: number;
  created_at: string;
}
```

---

### DELETE `/favorites/{id}`

**描述**: 取消收藏 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应** (200 OK):
```typescript
{
  message: "已取消收藏";
}
```

---

### PATCH `/favorites/reorder`

**描述**: 调整收藏顺序 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```typescript
{
  orders: Array<{
    id: number;
    sort_order: number;
  }>;
}
```

**响应** (200 OK):
```typescript
{
  message: "排序已更新";
}
```

---

## 绘图管理

### GET `/stocks/{code}/drawings`

**描述**: 获取股票的绘图对象 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**路径参数**:
- `code`: 股票代码

**查询参数**:
```typescript
{
  period: "daily" | "weekly";  // 必填
}
```

**响应** (200 OK):
```typescript
{
  drawings: Array<{
    id: number;
    drawing_type: "trendline" | "horizontal" | "vertical" | "rectangle";
    coordinates: Array<{
      date?: string;  // YYYY-MM-DD
      price?: number;
    }>;
    created_at: string;
  }>;
}
```

---

### POST `/stocks/{code}/drawings`

**描述**: 创建绘图对象 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```typescript
{
  period: "daily" | "weekly";
  drawing_type: "trendline" | "horizontal" | "vertical" | "rectangle";
  coordinates: Array<{
    date?: string;
    price?: number;
  }>;
}
```

**响应** (201 Created):
```typescript
{
  id: number;
  drawing_type: string;
  coordinates: Array<...>;
  created_at: string;
}
```

---

### DELETE `/drawings/{id}`

**描述**: 删除绘图对象 (需要认证)

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应** (200 OK):
```typescript
{
  message: "绘图已删除";
}
```

---

## 通用错误响应

### 400 Bad Request
```typescript
{
  detail: string | Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}
```

### 401 Unauthorized
```typescript
{
  detail: "未授权，请先登录";
}
```

### 403 Forbidden
```typescript
{
  detail: "无权限访问";
}
```

### 404 Not Found
```typescript
{
  detail: "资源未找到";
}
```

### 429 Too Many Requests
```typescript
{
  detail: "请求过于频繁，请稍后再试";
  retry_after: number;  // 秒数
}
```

### 500 Internal Server Error
```typescript
{
  detail: "服务器内部错误";
  error_id: string;  // 用于日志追踪
}
```

---

## 认证机制

使用 JWT (JSON Web Token) 进行认证：

1. 用户通过 `/auth/login` 登录，获取 `access_token`
2. 后续请求在 Header 中携带 `Authorization: Bearer <access_token>`
3. Token 有效期: 24小时
4. Token 过期后需要重新登录

---

## 限流策略

- **匿名用户**: 10 req/min
- **已登录用户**: 60 req/min
- **数据更新接口**: 1 req/hour (防止滥用)

---

## CORS 配置

允许的源:
- `http://localhost:3000` (开发环境)
- `http://localhost:5173` (Vite 默认端口)
- 生产环境域名 (部署时配置)

---

## API 版本管理

当前版本: `v1`

API 版本化策略:
- URL 路径版本号 (`/api/v1`, `/api/v2`)
- 向后兼容: 旧版本至少维护6个月
- 废弃通知: 通过响应头 `X-API-Deprecated: true`

---

## 下一步

✅ Phase 1 - API 接口契约设计完成  
➡️ 继续 Phase 1: 创建快速开始指南
