# API契约：成交量激增扫描器

**功能**: 008-volume-surge-scan | **日期**: 2026-03-18  
**基础URL**: `http://localhost:3000/api/volume-surge`

## 概述

本文档定义成交量激增扫描器的REST API接口契约，供前端和CLI工具调用。

**认证**: 暂不需要（本地应用）  
**Content-Type**: `application/json`  
**响应格式**: JSON

---

## 1. 触发扫描

### `POST /scan`

创建并执行新的成交量激增扫描。

**请求体**:

```typescript
interface ScanRequest {
  mode: 'auto' | 'manual';         // 扫描模式
  referenceDate?: string;          // 手动模式的参考日期 (YYYY-MM-DD)
  source?: 'web' | 'cli';         // 触发来源（可选）
}
```

**示例请求**:

```json
// 自动模式
{
  "mode": "auto",
  "source": "web"
}

// 手动模式
{
  "mode": "manual",
  "referenceDate": "2026-03-02",
  "source": "cli"
}
```

**成功响应** (202 Accepted):

```json
{
  "success": true,
  "data": {
    "scanId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "message": "Scan started successfully"
  }
}
```

**错误响应** (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "referenceDate is required when mode is 'manual'"
  }
}
```

**验证规则**:
- `mode = 'manual'` 时，`referenceDate` 必填
- `referenceDate` 格式必须为 `YYYY-MM-DD`
- `referenceDate` 不能晚于当前日期

---

## 2. 查询扫描状态

### `GET /scans/:scanId`

获取指定扫描的执行状态和元数据。

**路径参数**:
- `scanId` (UUID): 扫描唯一标识

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "scanId": "550e8400-e29b-41d4-a716-446655440000",
    "scanDate": "2026-03-18T10:30:00Z",
    "scanMode": "auto",
    "referenceDate": null,
    "status": "completed",
    "totalStocks": 3000,
    "matchedStocks": 42,
    "durationMs": 8500,
    "createdBy": "web",
    "createdAt": "2026-03-18T10:30:00Z",
    "updatedAt": "2026-03-18T10:30:08Z"
  }
}
```

**状态枚举**:
- `running`: 扫描进行中
- `completed`: 扫描成功完成
- `failed`: 扫描失败
- `cancelled`: 用户取消

**错误响应** (404 Not Found):

```json
{
  "success": false,
  "error": {
    "code": "SCAN_NOT_FOUND",
    "message": "Scan with id '550e8400...' not found"
  }
}
```

---

## 3. 查询历史扫描列表

### `GET /scans`

获取历史扫描记录列表，支持分页和过滤。

**查询参数**:
- `page` (number, 可选, 默认=1): 页码
- `limit` (number, 可选, 默认=10, 最大=100): 每页数量
- `status` (string, 可选): 过滤状态 ('completed', 'failed', 'running', 'cancelled')
- `mode` (string, 可选): 过滤模式 ('auto', 'manual')

**示例请求**:
```
GET /scans?page=1&limit=10&status=completed
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "scanId": "550e8400-e29b-41d4-a716-446655440000",
        "scanDate": "2026-03-18T10:30:00Z",
        "scanMode": "auto",
        "status": "completed",
        "totalStocks": 3000,
        "matchedStocks": 42,
        "durationMs": 8500,
        "createdBy": "web"
      },
      {
        "scanId": "661f9511-f39c-52e5-b827-557766551111",
        "scanDate": "2026-03-15T14:20:00Z",
        "scanMode": "manual",
        "referenceDate": "2026-03-02",
        "status": "completed",
        "totalStocks": 3000,
        "matchedStocks": 38,
        "durationMs": 9200,
        "createdBy": "cli"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

## 4. 查询扫描结果

### `GET /scans/:scanId/results`

获取指定扫描的股票结果列表。

**路径参数**:
- `scanId` (UUID): 扫描唯一标识

**查询参数**:
- `page` (number, 可选, 默认=1): 页码
- `limit` (number, 可选, 默认=20, 最大=100): 每页数量
- `filter` (string, 可选): 过滤条件
  - `all`: 所有股票（默认）
  - `matched`: 仅符合所有条件的股票
  - `unmatched`: 不符合条件的股票
- `sortBy` (string, 可选, 默认='volumeSupportRatio'): 排序字段
- `sortOrder` (string, 可选, 默认='desc'): 排序顺序 ('asc', 'desc')

**示例请求**:
```
GET /scans/550e8400-e29b-41d4-a716-446655440000/results?filter=matched&sortBy=volumeSupportRatio&sortOrder=desc
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "resultId": "770fa622-g49d-63f6-c938-668877662222",
        "stockCode": "SH600111",
        "stockName": "北方稀土",
        "contractionPeriod": {
          "startDate": "2026-02-20",
          "endDate": "2026-03-01",
          "avgVolume": 150000000
        },
        "expansion": {
          "startDate": "2026-03-02",
          "days": 10,
          "multiplier": 2.5
        },
        "volumeSupport": {
          "upDayAvgVolume": 400000000,
          "downDayAvgVolume": 200000000,
          "ratio": 2.0
        },
        "movingAverages": {
          "ma50": 12.5,
          "ma150": 13.2,
          "ma50Slope": 0.05,
          "ma50TrendingUp": true,
          "ma50BelowMa150": true
        },
        "criteria": {
          "meetsVolumeCriteria": true,
          "meetsMaCriteria": true,
          "meetsSupportCriteria": true,
          "meetsAllCriteria": true
        }
      }
      // ... more results
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    },
    "summary": {
      "totalStocks": 3000,
      "matchedStocks": 42,
      "unmatchedStocks": 2958
    }
  }
}
```

**错误响应** (404 Not Found):

```json
{
  "success": false,
  "error": {
    "code": "SCAN_NOT_FOUND",
    "message": "Scan with id '550e8400...' not found"
  }
}
```

---

## 5. 导出扫描结果

### `GET /scans/:scanId/export`

导出指定扫描的结果为CSV或Markdown格式。

**路径参数**:
- `scanId` (UUID): 扫描唯一标识

**查询参数**:
- `format` (string, 必填): 导出格式 ('csv', 'markdown')
- `filter` (string, 可选, 默认='matched'): 过滤条件 ('all', 'matched')

**示例请求**:
```
GET /scans/550e8400-e29b-41d4-a716-446655440000/export?format=csv&filter=matched
```

**成功响应 - CSV格式** (200 OK):

```
Content-Type: text/csv
Content-Disposition: attachment; filename="volume-surge-scan-2026-03-18.csv"

Stock Code,Stock Name,Contraction Start,Contraction End,Expansion Start,Expansion Multiplier,Up Day Avg Volume,Down Day Avg Volume,Volume Support Ratio,MA50,MA150,MA50 Slope,Meets All Criteria
SH600111,北方稀土,2026-02-20,2026-03-01,2026-03-02,2.5,400000000,200000000,2.0,12.5,13.2,0.05,true
SZ002594,比亚迪,2026-02-18,2026-02-28,2026-03-01,3.2,800000000,300000000,2.67,250.5,255.0,0.08,true
...
```

**成功响应 - Markdown格式** (200 OK):

```
Content-Type: text/markdown
Content-Disposition: attachment; filename="volume-surge-scan-2026-03-18.md"

# Volume Surge Scan Results - 2026-03-18

## Summary
- Total Stocks Scanned: 3000
- Matched Stocks: 42
- Scan Duration: 8.5s

## Matched Stocks

### 1. SH600111 - 北方稀土

**Volume Pattern**:
- Contraction Period: 2026-02-20 to 2026-03-01
- Contraction Avg Volume: 150,000,000
- Expansion Start: 2026-03-02
- Expansion Multiplier: 2.5x

**Volume Support**:
- Up Day Avg Volume: 400,000,000
- Down Day Avg Volume: 200,000,000
- Support Ratio: 2.0

**Moving Averages**:
- MA50: 12.5 (Trending Up ✓)
- MA150: 13.2
- MA50 Below MA150: Yes ✓

**Status**: ✅ Meets All Criteria

---

### 2. SZ002594 - 比亚迪
...
```

**错误响应** (400 Bad Request):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FORMAT",
    "message": "format must be 'csv' or 'markdown'"
  }
}
```

---

## 6. 对比两次扫描结果

### `POST /compare`

对比两次扫描结果，识别持续符合条件的股票。

**请求体**:

```typescript
interface CompareRequest {
  scanId1: string;  // 第一次扫描ID
  scanId2: string;  // 第二次扫描ID
}
```

**示例请求**:

```json
{
  "scanId1": "550e8400-e29b-41d4-a716-446655440000",
  "scanId2": "661f9511-f39c-52e5-b827-557766551111"
}
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "scan1": {
      "scanId": "550e8400-e29b-41d4-a716-446655440000",
      "scanDate": "2026-03-18T10:30:00Z",
      "matchedStocks": 42
    },
    "scan2": {
      "scanId": "661f9511-f39c-52e5-b827-557766551111",
      "scanDate": "2026-03-15T14:20:00Z",
      "matchedStocks": 38
    },
    "persistentStocks": [
      {
        "stockCode": "SH600111",
        "stockName": "北方稀土",
        "volumeSupportRatio1": 2.0,
        "volumeSupportRatio2": 1.8,
        "trend": "improving"
      },
      {
        "stockCode": "SZ002594",
        "stockName": "比亚迪",
        "volumeSupportRatio1": 2.67,
        "volumeSupportRatio2": 2.9,
        "trend": "improving"
      }
    ],
    "summary": {
      "persistentCount": 15,
      "onlyInScan1": 27,
      "onlyInScan2": 23
    }
  }
}
```

**错误响应** (404 Not Found):

```json
{
  "success": false,
  "error": {
    "code": "SCAN_NOT_FOUND",
    "message": "One or both scans not found"
  }
}
```

---

## 7. 取消扫描

### `POST /scans/:scanId/cancel`

取消正在运行的扫描。

**路径参数**:
- `scanId` (UUID): 扫描唯一标识

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "scanId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "message": "Scan cancelled successfully"
  }
}
```

**错误响应** (409 Conflict):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot cancel scan with status 'completed'"
  }
}
```

**业务规则**:
- 只能取消状态为 `running` 的扫描
- 取消后状态变为 `cancelled`
- 不保存不完整的结果

---

## 通用错误码

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| `INVALID_REQUEST` | 400 | 请求参数验证失败 |
| `SCAN_NOT_FOUND` | 404 | 扫描ID不存在 |
| `INVALID_STATE` | 409 | 状态冲突（如取消已完成的扫描） |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `INVALID_FORMAT` | 400 | 不支持的导出格式 |

---

## 响应结构规范

### 成功响应

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
}
```

### 错误响应

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;  // 可选的详细错误信息
  };
}
```

---

## CLI工具映射

CLI工具通过调用上述API实现功能：

| CLI命令 | API调用 |
|---------|---------|
| `npm run scan:volume-surge` | `POST /scan` (mode=auto) |
| `npm run scan:volume-surge -- --date 2026-03-02` | `POST /scan` (mode=manual, referenceDate) |
| `npm run scan:volume-surge -- --export csv` | `POST /scan` + `GET /export?format=csv` |
| 脚本退出前查询状态 | `GET /scans/:scanId` (轮询) |

---

## 测试用例矩阵

| 端点 | 测试场景 | 预期结果 |
|------|----------|----------|
| `POST /scan` | mode=auto, 无referenceDate | 202, scanId返回 |
| `POST /scan` | mode=manual, 有referenceDate | 202, scanId返回 |
| `POST /scan` | mode=manual, 无referenceDate | 400, INVALID_REQUEST |
| `POST /scan` | referenceDate未来日期 | 400, INVALID_REQUEST |
| `GET /scans/:scanId` | 有效scanId | 200, 完整扫描信息 |
| `GET /scans/:scanId` | 无效scanId | 404, SCAN_NOT_FOUND |
| `GET /scans/:scanId/results` | filter=matched | 200, 仅符合条件股票 |
| `GET /scans/:scanId/export` | format=csv | 200, CSV文件 |
| `GET /scans/:scanId/export` | format=markdown | 200, Markdown文件 |
| `GET /scans/:scanId/export` | format=invalid | 400, INVALID_FORMAT |
| `POST /compare` | 两个有效scanId | 200, 对比结果 |
| `POST /scans/:scanId/cancel` | status=running | 200, 取消成功 |
| `POST /scans/:scanId/cancel` | status=completed | 409, INVALID_STATE |

---

**下一步**: 创建快速开始指南（quickstart.md）
