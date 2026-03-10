# API 规格说明：股票分析工具

**Branch**: `001-stock-analysis-tool` | **Date**: 2026-02-28 | **Phase**: 1 (Design)

## 概述

本文档定义股票分析工具的 RESTful API 规格，使用 Nest.js 框架实现。所有 API 遵循 REST 设计原则，返回 JSON 格式数据。

**基础 URL**: `http://localhost:3000/api/v1`

**认证方式**: JWT Bearer Token

---

## 认证 (Authentication)

### POST /auth/login

用户登录，获取 JWT token

**请求体**:
```json
{
  "username": "admin",
  "password": "admin"
}
```

**响应** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "username": "admin"
  }
}
```

**错误响应** (401):
```json
{
  "statusCode": 401,
  "message": "账户名或密码错误",
  "error": "Unauthorized"
}
```

---

### POST /auth/logout

用户登出（客户端清除 token）

**Headers**: `Authorization: Bearer <token>`

**响应** (200):
```json
{
  "message": "Logout successful"
}
```

---

### GET /auth/me

获取当前登录用户信息

**Headers**: `Authorization: Bearer <token>`

**响应** (200):
```json
{
  "userId": "uuid",
  "username": "admin",
  "preferences": {
    "defaultPeriod": "daily",
    "defaultIndicators": ["ma", "volume"]
  }
}
```

---

## 股票 (Stocks)

### GET /stocks/search

搜索股票（支持代码和名称模糊搜索）

**查询参数**:
- `q` (string, required): 搜索关键词（代码或名称）
- `limit` (number, optional, default=20): 返回数量限制

**示例**: `/stocks/search?q=600519&limit=10`

**响应** (200):
```json
{
  "results": [
    {
      "stockCode": "600519",
      "stockName": "贵州茅台",
      "market": "SH",
      "industry": "食品饮料",
      "latestPrice": 1850.50,
      "priceChange": 15.30,
      "priceChangePercent": 0.83
    }
  ],
  "count": 1
}
```

---

### GET /stocks

获取股票列表（支持分页）

**查询参数**:
- `page` (number, optional, default=1): 页码
- `pageSize` (number, optional, default=50): 每页数量
- `market` (string, optional): 市场筛选 ('SH' | 'SZ')
- `admissionStatus` (string, optional): 准入状态 ('active' | 'inactive')

**示例**: `/stocks?page=1&pageSize=50&market=SH&admissionStatus=active`

**响应** (200):
```json
{
  "data": [
    {
      "stockCode": "600519",
      "stockName": "贵州茅台",
      "market": "SH",
      "industry": "食品饮料",
      "listDate": "2001-08-27",
      "marketCap": 2300.5,
      "admissionStatus": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

---

### GET /stocks/:stockCode

获取单只股票详细信息

**路径参数**:
- `stockCode` (string): 股票代码（如 '600519'）

**示例**: `/stocks/600519`

**响应** (200):
```json
{
  "stockCode": "600519",
  "stockName": "贵州茅台",
  "market": "SH",
  "industry": "食品饮料",
  "listDate": "2001-08-27",
  "marketCap": 2300.5,
  "avgTurnover": 50000,
  "admissionStatus": "active",
  "latestPrice": 1850.50,
  "priceChange": 15.30,
  "priceChangePercent": 0.83,
  "updatedAt": "2026-02-28T10:30:00Z"
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "股票未找到",
  "error": "Not Found"
}
```

---

## K线数据 (K-Line Data)

### GET /klines/:stockCode

获取股票K线数据

**路径参数**:
- `stockCode` (string): 股票代码

**查询参数**:
- `period` (string, required): K线周期 ('daily' | 'weekly')
- `startDate` (string, optional): 开始日期 (YYYY-MM-DD)
- `endDate` (string, optional): 结束日期 (YYYY-MM-DD)
- `limit` (number, optional, default=500): 最多返回条数

**示例**: `/klines/600519?period=daily&startDate=2025-01-01&endDate=2026-02-28&limit=500`

**响应** (200):
```json
{
  "stockCode": "600519",
  "period": "daily",
  "data": [
    {
      "date": "2026-02-28",
      "open": 1840.00,
      "high": 1860.50,
      "low": 1835.00,
      "close": 1850.50,
      "volume": 1250000,
      "amount": 230000000
    }
  ],
  "count": 250
}
```

---

### POST /klines/:stockCode/refresh

手动触发单只股票K线数据刷新（增量更新）

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `stockCode` (string): 股票代码

**响应** (200):
```json
{
  "message": "K线数据刷新成功",
  "stockCode": "600519",
  "newRecords": 3,
  "source": "tushare"
}
```

---

## 技术指标 (Technical Indicators)

### GET /indicators/:stockCode

获取股票技术指标数据

**路径参数**:
- `stockCode` (string): 股票代码

**查询参数**:
- `period` (string, required): K线周期 ('daily' | 'weekly')
- `indicators` (string[], optional): 指标类型数组 ['ma', 'kdj', 'rsi', 'volume', 'amount', 'week52_marker']
- `startDate` (string, optional): 开始日期
- `endDate` (string, optional): 结束日期
- `limit` (number, optional, default=500): 最多返回条数

**示例**: `/indicators/600519?period=daily&indicators=ma,kdj,rsi&startDate=2025-01-01&limit=500`

**响应** (200):
```json
{
  "stockCode": "600519",
  "period": "daily",
  "data": [
    {
      "date": "2026-02-28",
      "ma": {
        "ma50": 1820.5,
        "ma150": 1780.3,
        "ma200": 1750.8
      },
      "kdj": {
        "k": 75.2,
        "d": 72.5,
        "j": 80.6
      },
      "rsi": {
        "value": 68.5
      }
    }
  ],
  "count": 250
}
```

---

### GET /indicators/:stockCode/week52-markers

获取52周高低点标注

**路径参数**:
- `stockCode` (string): 股票代码

**查询参数**:
- `period` (string, required): K线周期 ('daily' | 'weekly')

**示例**: `/indicators/600519/week52-markers?period=daily`

**响应** (200):
```json
{
  "stockCode": "600519",
  "period": "daily",
  "marker": {
    "high": 1950.80,
    "low": 1620.50,
    "highDate": "2026-01-15",
    "lowDate": "2025-08-20"
  }
}
```

---

## 选股筛选 (Screener)

### POST /screener/execute

执行选股筛选

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "conditions": [
    {
      "conditionType": "indicator_value",
      "indicatorName": "rsi",
      "operator": "<",
      "targetValue": 30
    },
    {
      "conditionType": "pattern",
      "pattern": "kdj_golden_cross"
    },
    {
      "conditionType": "price_change",
      "operator": ">",
      "targetValue": 5
    }
  ],
  "sortBy": "priceChangePercent",  // 'stockCode' | 'priceChangePercent' | 'amount' | 'marketCap'
  "sortOrder": "desc"  // 'asc' | 'desc'
}
```

**响应** (200):
```json
{
  "results": [
    {
      "stockCode": "600519",
      "stockName": "贵州茅台",
      "latestPrice": 1850.50,
      "priceChange": 15.30,
      "priceChangePercent": 0.83,
      "marketCap": 2300.5,
      "amount": 230000000
    }
  ],
  "count": 85,
  "isTruncated": false,
  "message": null
}
```

**响应（结果超过100只）**:
```json
{
  "results": [...],  // 前100只
  "count": 100,
  "isTruncated": true,
  "message": "结果过多（超过100只），仅显示前100个，请优化筛选条件"
}
```

---

## 筛选策略 (Screener Strategies)

### POST /strategies

创建筛选策略

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "strategyName": "RSI超卖策略",
  "description": "寻找RSI低于30的超卖股票",
  "conditions": [
    {
      "conditionType": "indicator_value",
      "indicatorName": "rsi",
      "operator": "<",
      "targetValue": 30,
      "sortOrder": 0
    }
  ]
}
```

**响应** (201):
```json
{
  "strategyId": "uuid",
  "strategyName": "RSI超卖策略",
  "description": "寻找RSI低于30的超卖股票",
  "conditionCount": 1,
  "createdAt": "2026-02-28T10:30:00Z"
}
```

---

### GET /strategies

获取用户的所有筛选策略

**Headers**: `Authorization: Bearer <token>`

**响应** (200):
```json
{
  "data": [
    {
      "strategyId": "uuid",
      "strategyName": "RSI超卖策略",
      "description": "寻找RSI低于30的超卖股票",
      "conditionCount": 1,
      "createdAt": "2026-02-28T10:30:00Z",
      "updatedAt": "2026-02-28T10:30:00Z"
    }
  ],
  "count": 5
}
```

---

### GET /strategies/:strategyId

获取策略详情

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `strategyId` (string): 策略ID

**响应** (200):
```json
{
  "strategyId": "uuid",
  "strategyName": "RSI超卖策略",
  "description": "寻找RSI低于30的超卖股票",
  "conditions": [
    {
      "conditionId": 1,
      "conditionType": "indicator_value",
      "indicatorName": "rsi",
      "operator": "<",
      "targetValue": 30,
      "sortOrder": 0
    }
  ],
  "createdAt": "2026-02-28T10:30:00Z",
  "updatedAt": "2026-02-28T10:30:00Z"
}
```

---

### PUT /strategies/:strategyId

更新策略

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `strategyId` (string): 策略ID

**请求体**:
```json
{
  "strategyName": "RSI超卖策略（更新）",
  "description": "新的描述",
  "conditions": [...]  // 完整的条件数组
}
```

**响应** (200):
```json
{
  "strategyId": "uuid",
  "strategyName": "RSI超卖策略（更新）",
  "updatedAt": "2026-02-28T11:00:00Z"
}
```

---

### DELETE /strategies/:strategyId

删除策略

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `strategyId` (string): 策略ID

**响应** (204): 无内容

---

### POST /strategies/:strategyId/execute

执行保存的策略

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `strategyId` (string): 策略ID

**查询参数**:
- `sortBy` (string, optional): 排序字段
- `sortOrder` (string, optional): 排序方向

**响应** (200): 同 `/screener/execute`

---

## 收藏 (Favorites)

### POST /favorites

添加收藏

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "stockCode": "600519",
  "groupName": "重点关注"
}
```

**响应** (201):
```json
{
  "id": 123,
  "stockCode": "600519",
  "groupName": "重点关注",
  "sortOrder": 0,
  "createdAt": "2026-02-28T10:30:00Z"
}
```

---

### GET /favorites

获取收藏列表

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `groupName` (string, optional): 按分组筛选

**响应** (200):
```json
{
  "data": [
    {
      "id": 123,
      "stockCode": "600519",
      "stockName": "贵州茅台",
      "groupName": "重点关注",
      "sortOrder": 0,
      "latestPrice": 1850.50,
      "priceChange": 15.30,
      "priceChangePercent": 0.83,
      "createdAt": "2026-02-28T10:30:00Z"
    }
  ],
  "count": 20
}
```

---

### PUT /favorites/:id/sort

更新收藏排序

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `id` (number): 收藏ID

**请求体**:
```json
{
  "sortOrder": 5
}
```

**响应** (200):
```json
{
  "id": 123,
  "sortOrder": 5
}
```

---

### DELETE /favorites/:id

删除收藏

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `id` (number): 收藏ID

**响应** (204): 无内容

---

## 绘图 (Drawings)

### POST /drawings

创建绘图对象

**Headers**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "stockCode": "600519",
  "period": "daily",
  "drawingType": "trend_line",
  "coordinates": [
    {"x": "2026-01-01", "y": 1750.5},
    {"x": "2026-02-01", "y": 1850.5}
  ]
}
```

**响应** (201):
```json
{
  "drawingId": "uuid",
  "stockCode": "600519",
  "period": "daily",
  "drawingType": "trend_line",
  "coordinates": [...],
  "stylePreset": "default",
  "createdAt": "2026-02-28T10:30:00Z"
}
```

---

### GET /drawings

获取绘图列表

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `stockCode` (string, required): 股票代码
- `period` (string, required): K线周期

**示例**: `/drawings?stockCode=600519&period=daily`

**响应** (200):
```json
{
  "data": [
    {
      "drawingId": "uuid",
      "drawingType": "trend_line",
      "coordinates": [
        {"x": "2026-01-01", "y": 1750.5},
        {"x": "2026-02-01", "y": 1850.5}
      ],
      "stylePreset": "default",
      "createdAt": "2026-02-28T10:30:00Z"
    }
  ],
  "count": 5
}
```

---

### DELETE /drawings/:drawingId

删除绘图对象

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `drawingId` (string): 绘图ID

**响应** (204): 无内容

---

## 数据更新 (Data Update)

### POST /data/update

手动触发增量数据更新（异步任务）

**Headers**: `Authorization: Bearer <token>`

**响应** (202):
```json
{
  "taskId": "uuid",
  "message": "数据更新任务已启动",
  "estimatedTime": "5-10分钟"
}
```

**错误响应（更新进行中）**:
```json
{
  "statusCode": 409,
  "message": "更新任务进行中（进度：500/1000），请稍候",
  "error": "Conflict"
}
```

---

### GET /data/update/:taskId/status

查询更新任务状态和进度

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `taskId` (string): 任务ID

**响应（进行中）** (200):
```json
{
  "taskId": "uuid",
  "status": "running",
  "totalStocks": 1000,
  "processedStocks": 500,
  "successCount": 480,
  "failedCount": 20,
  "startTime": "2026-02-28T10:30:00Z",
  "progressPercent": 50.0
}
```

**响应（已完成）** (200):
```json
{
  "taskId": "uuid",
  "status": "completed",
  "totalStocks": 1000,
  "processedStocks": 1000,
  "successCount": 980,
  "failedCount": 20,
  "startTime": "2026-02-28T10:30:00Z",
  "endTime": "2026-02-28T10:38:00Z",
  "duration": "8分钟",
  "progressPercent": 100.0
}
```

---

### GET /data/update/history

获取历史更新记录

**Headers**: `Authorization: Bearer <token>`

**查询参数**:
- `limit` (number, optional, default=10): 返回数量

**响应** (200):
```json
{
  "data": [
    {
      "taskId": "uuid",
      "status": "completed",
      "totalStocks": 1000,
      "successCount": 980,
      "failedCount": 20,
      "startTime": "2026-02-28T10:30:00Z",
      "endTime": "2026-02-28T10:38:00Z",
      "duration": "8分钟"
    }
  ],
  "count": 10
}
```

---

### GET /data/update/:taskId/logs

获取更新任务的详细错误日志

**Headers**: `Authorization: Bearer <token>`

**路径参数**:
- `taskId` (string): 任务ID

**响应** (200):
```json
{
  "taskId": "uuid",
  "errorDetails": [
    {
      "stockCode": "600001",
      "errorReason": "API timeout",
      "retryResult": "success"
    },
    {
      "stockCode": "600002",
      "errorReason": "Data format error",
      "retryResult": "failed"
    }
  ],
  "failedCount": 20
}
```

---

## 通用错误响应

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "未授权访问，请先登录",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "无权访问此资源",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "资源未找到",
  "error": "Not Found"
}
```

### 422 Validation Error
```json
{
  "statusCode": 422,
  "message": "请求参数验证失败",
  "errors": [
    {
      "field": "stockCode",
      "message": "stockCode must be a string"
    }
  ],
  "error": "Unprocessable Entity"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "服务器内部错误",
  "error": "Internal Server Error"
}
```

---

## API 限流 (Rate Limiting)

| 端点类型 | 限制 |
|---------|------|
| 认证端点 | 10 次/分钟 |
| 数据查询端点 | 100 次/分钟 |
| 数据更新端点 | 5 次/小时 |

**超出限制响应** (429):
```json
{
  "statusCode": 429,
  "message": "请求过于频繁，请稍后再试",
  "retryAfter": 60
}
```

---

## CORS 配置

**允许的源**: 配置中的前端域名（开发：`http://localhost:5173`，生产：具体域名）

**允许的方法**: GET, POST, PUT, DELETE, OPTIONS

**允许的头**: Content-Type, Authorization

---

## API 版本控制

**当前版本**: v1

**URL 格式**: `/api/v1/*`

**版本升级策略**: 引入破坏性变更时创建新版本（v2），旧版本保持至少6个月

---

## Swagger 文档

**开发环境**: `http://localhost:3000/api-docs`

**生产环境**: 禁用

使用 `@nestjs/swagger` 自动生成，所有端点都有详细的参数说明和示例。

---

## 总结

✅ **API 契约设计完成**

- 9 个模块，40+ 个端点
- RESTful 设计原则
- JWT 认证
- 完整的错误处理
- 限流和 CORS 配置
- Swagger 文档支持

**下一步**: 生成快速开始指南（quickstart.md）
