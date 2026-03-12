# API Contract: VCP Analysis API

**Feature**: 004-stock-vcp-analysis  
**Version**: 1.0.0  
**Date**: 2026-03-11  
**Base URL**: `/api/vcp`

## Overview

VCP分析API提供单股票的VCP形态分析功能，支持缓存优先和实时重算两种模式。

---

## Endpoint: Generate VCP Analysis

### Request

```
GET /api/vcp/:stockCode/analysis
```

**Path Parameters**:
| Name | Type | Required | Description | Example |
|------|------|----------|-------------|---------|
| stockCode | string | Yes | 股票代码（6位数字） | `605117` |

**Query Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| forceRefresh | boolean | No | `false` | 是否强制实时重新计算，忽略缓存 |

**Headers**:
```
Content-Type: application/json
```

**Example Request**:
```http
GET /api/vcp/605117/analysis?forceRefresh=false HTTP/1.1
Host: localhost:3000
```

---

### Response: Success (200 OK)

**Content-Type**: `application/json`

**Response Body**:
```json
{
  "stockCode": "605117",
  "stockName": "德业股份",
  "scanDate": "2026-03-11",
  "cached": false,
  "isExpired": false,
  "hasVcp": true,
  "summary": {
    "contractionCount": 3,
    "lastContractionPct": 12.34,
    "volumeDryingUp": true,
    "rsRating": 85,
    "inPullback": false,
    "pullbackCount": 2,
    "latestPrice": 45.67,
    "priceChangePct": 2.15,
    "distFrom52WeekHigh": -5.23,
    "distFrom52WeekLow": 68.45
  },
  "contractions": [
    {
      "index": 1,
      "swingHighDate": "2025-11-15",
      "swingHighPrice": 48.50,
      "swingLowDate": "2025-11-30",
      "swingLowPrice": 31.53,
      "depthPct": 35.00,
      "durationDays": 15,
      "avgVolume": 1250000
    },
    {
      "index": 2,
      "swingHighDate": "2025-12-10",
      "swingHighPrice": 46.20,
      "swingLowDate": "2025-12-22",
      "swingLowPrice": 36.96,
      "depthPct": 20.00,
      "durationDays": 12,
      "avgVolume": 980000
    },
    {
      "index": 3,
      "swingHighDate": "2026-01-08",
      "swingHighPrice": 45.00,
      "swingLowDate": "2026-01-18",
      "swingLowPrice": 39.42,
      "depthPct": 12.40,
      "durationDays": 10,
      "avgVolume": 750000
    }
  ],
  "pullbacks": [
    {
      "index": 1,
      "highDate": "2026-02-15",
      "highPrice": 47.80,
      "lowDate": "2026-02-20",
      "lowPrice": 44.06,
      "pullbackPct": 7.82,
      "durationDays": 5,
      "avgVolume": 850000,
      "isInUptrend": true,
      "daysSinceLow": 19
    },
    {
      "index": 2,
      "highDate": "2026-03-05",
      "highPrice": 46.50,
      "lowDate": "2026-03-08",
      "lowPrice": 44.18,
      "pullbackPct": 4.99,
      "durationDays": 3,
      "avgVolume": 720000,
      "isInUptrend": true,
      "daysSinceLow": 3
    }
  ],
  "klines": [
    {
      "date": "2026-03-01",
      "open": 44.50,
      "high": 45.20,
      "low": 44.10,
      "close": 44.85,
      "volume": 680000,
      "changePct": 0.78
    },
    {
      "date": "2026-03-02",
      "open": 44.90,
      "high": 45.60,
      "low": 44.75,
      "close": 45.30,
      "volume": 720000,
      "changePct": 1.00
    }
    // ... 最近10天数据
  ],
  "trendTemplate": {
    "pass": true,
    "checks": [
      {
        "name": "股价高于200日均线",
        "pass": true,
        "description": "当前价格 45.67 > MA200 38.20"
      },
      {
        "name": "50日均线高于200日均线",
        "pass": true,
        "description": "MA50 42.15 > MA200 38.20"
      },
      {
        "name": "股价高于50日均线",
        "pass": true,
        "description": "当前价格 45.67 > MA50 42.15"
      },
      {
        "name": "52周新高或接近新高",
        "pass": true,
        "description": "距52周高点 -5.23%，在15%范围内"
      },
      {
        "name": "RS评分大于70",
        "pass": true,
        "description": "RS评分 85 > 70"
      }
    ]
  }
}
```

**Field Descriptions**:

| Field Path | Type | Description | Constraints |
|------------|------|-------------|-------------|
| `stockCode` | string | 股票代码 | 6位数字 |
| `stockName` | string | 股票名称 | 非空 |
| `scanDate` | string | 扫描日期（ISO 8601格式） | YYYY-MM-DD |
| `cached` | boolean | 是否来自缓存 | true/false |
| `isExpired` | boolean | 是否过期（>7天） | true/false |
| `hasVcp` | boolean | 是否有有效的VCP形态 | true/false |
| `summary.contractionCount` | number | 收缩次数 | >= 0 |
| `summary.lastContractionPct` | number | 最后收缩幅度（%） | 0-100 |
| `summary.volumeDryingUp` | boolean | 成交量是否萎缩 | true/false |
| `summary.rsRating` | number | RS评分 | 0-100 |
| `summary.inPullback` | boolean | 当前是否处于回调 | true/false |
| `summary.pullbackCount` | number | 回调次数 | >= 0 |
| `summary.latestPrice` | number | 最新价格 | > 0 |
| `summary.priceChangePct` | number | 涨跌幅（%） | 可正可负 |
| `summary.distFrom52WeekHigh` | number | 距52周高点（%） | <= 0 |
| `summary.distFrom52WeekLow` | number | 距52周低点（%） | >= 0 |
| `contractions[]` | array | 收缩阶段列表 | 按时间顺序排列 |
| `contractions[].index` | number | 收缩序号 | 1, 2, 3, ... |
| `contractions[].swingHighDate` | string | 高点日期 | YYYY-MM-DD |
| `contractions[].swingHighPrice` | number | 高点价格 | > 0 |
| `contractions[].swingLowDate` | string | 低点日期 | YYYY-MM-DD |
| `contractions[].swingLowPrice` | number | 低点价格 | > 0 |
| `contractions[].depthPct` | number | 收缩幅度（%） | 0-100 |
| `contractions[].durationDays` | number | 持续天数 | > 0 |
| `contractions[].avgVolume` | number | 平均成交量 | >= 0 |
| `pullbacks[]` | array | 回调阶段列表 | 按时间顺序排列 |
| `pullbacks[].index` | number | 回调序号 | 1, 2, 3, ... |
| `pullbacks[].highDate` | string | 高点日期 | YYYY-MM-DD |
| `pullbacks[].highPrice` | number | 高点价格 | > 0 |
| `pullbacks[].lowDate` | string | 低点日期 | YYYY-MM-DD |
| `pullbacks[].lowPrice` | number | 低点价格 | > 0 |
| `pullbacks[].pullbackPct` | number | 回调幅度（%） | 0-100 |
| `pullbacks[].durationDays` | number | 持续天数 | > 0 |
| `pullbacks[].avgVolume` | number | 平均成交量 | >= 0 |
| `pullbacks[].isInUptrend` | boolean | 是否在上升趋势中 | true/false |
| `pullbacks[].daysSinceLow` | number | 距回调低点天数 | >= 0 |
| `klines[]` | array | K线数据列表（最近10天） | 按时间顺序排列 |
| `klines[].date` | string | 日期 | YYYY-MM-DD |
| `klines[].open` | number | 开盘价 | > 0 |
| `klines[].high` | number | 最高价 | > 0 |
| `klines[].low` | number | 最低价 | > 0 |
| `klines[].close` | number | 收盘价 | > 0 |
| `klines[].volume` | number | 成交量 | >= 0 |
| `klines[].changePct` | number | 涨跌幅（%） | 可正可负 |
| `trendTemplate.pass` | boolean | 趋势模板是否通过 | true/false |
| `trendTemplate.checks[]` | array | 趋势模板检查项 | - |
| `trendTemplate.checks[].name` | string | 检查项名称 | 非空 |
| `trendTemplate.checks[].pass` | boolean | 是否通过 | true/false |
| `trendTemplate.checks[].description` | string | 检查项说明（可选） | - |

---

### Response: Stock Not Found (404)

**Content-Type**: `application/json`

**Response Body**:
```json
{
  "statusCode": 404,
  "message": "未找到股票代码 999999，请检查输入",
  "error": "Not Found",
  "stockCode": "999999"
}
```

**When This Occurs**:
- 请求的股票代码在数据库中不存在
- 股票代码格式正确但未录入系统

---

### Response: Insufficient Data (400)

**Content-Type**: `application/json`

**Response Body**:
```json
{
  "statusCode": 400,
  "message": "该股票暂无足够的K线数据进行VCP分析（需要至少30天数据）",
  "error": "Bad Request",
  "stockCode": "605117",
  "availableDays": 15
}
```

**When This Occurs**:
- K线数据少于30天（VCP分析最低要求）
- 新上市股票或数据尚未同步

---

### Response: Analysis Failed (500)

**Content-Type**: `application/json`

**Response Body**:
```json
{
  "statusCode": 500,
  "message": "VCP分析失败，请稍后重试",
  "error": "Internal Server Error",
  "stockCode": "605117"
}
```

**When This Occurs**:
- VCP分析计算过程中发生异常
- 数据库查询失败
- 服务内部错误

---

## Request Examples

### Example 1: 使用缓存数据（默认）

```bash
curl -X GET "http://localhost:3000/api/vcp/605117/analysis" \
  -H "Content-Type: application/json"
```

**Expected Response**: 返回缓存的VCP分析结果（如果存在），`cached: true`

---

### Example 2: 强制实时重新计算

```bash
curl -X GET "http://localhost:3000/api/vcp/605117/analysis?forceRefresh=true" \
  -H "Content-Type: application/json"
```

**Expected Response**: 忽略缓存，实时计算VCP分析，`cached: false`

---

### Example 3: 查询不存在的股票

```bash
curl -X GET "http://localhost:3000/api/vcp/999999/analysis" \
  -H "Content-Type: application/json"
```

**Expected Response**: 404错误，提示股票不存在

---

## Frontend Integration

### JavaScript/TypeScript Example

```typescript
// frontend/src/services/vcp.service.ts
import axios from 'axios';
import type { VcpAnalysis } from '../types/vcp';

const API_BASE = '/api/vcp';

export async function generateVcpAnalysis(
  stockCode: string,
  forceRefresh = false
): Promise<VcpAnalysis> {
  try {
    const response = await axios.get<VcpAnalysis>(
      `${API_BASE}/${stockCode}/analysis`,
      {
        params: { forceRefresh },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      if (status === 404) {
        throw new Error(data.message || `未找到股票代码 ${stockCode}`);
      } else if (status === 400) {
        throw new Error(data.message || 'K线数据不足');
      } else {
        throw new Error(data.message || 'VCP分析失败');
      }
    }
    throw error;
  }
}
```

### React Hook Example

```typescript
// frontend/src/hooks/useVcpAnalysis.ts
import { useQuery } from '@tanstack/react-query';
import { generateVcpAnalysis } from '../services/vcp.service';

export function useVcpAnalysis(stockCode: string, forceRefresh = false) {
  return useQuery({
    queryKey: ['vcp-analysis', stockCode, forceRefresh],
    queryFn: () => generateVcpAnalysis(stockCode, forceRefresh),
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7天
    enabled: !!stockCode,
  });
}
```

---

## Performance Characteristics

| Metric | Target | Typical |
|--------|--------|---------|
| Response Time (cached) | < 500ms | ~200ms |
| Response Time (fresh) | < 3000ms | ~1500ms |
| Response Size | < 5KB | ~2.7KB |
| Concurrent Requests | 50+ | - |

---

## Versioning

**Current Version**: v1.0.0  
**API Stability**: Stable  
**Breaking Changes**: None planned

**Future Enhancements** (non-breaking):
- 支持返回更多K线数据（通过query参数 `klineCount`）
- 支持导出为PDF或图片格式
- 支持批量查询多只股票

---

## Security Considerations

- **No Authentication Required** (当前版本为内部工具)
- **Rate Limiting**: 建议实施每IP每分钟最多30次请求
- **Input Validation**: 股票代码必须为6位数字，防止SQL注入

---

## Error Handling Best Practices

### Frontend Error Handling

```typescript
try {
  const analysis = await generateVcpAnalysis(stockCode);
  // 处理成功响应
} catch (error) {
  if (error.message.includes('未找到股票')) {
    // 显示"股票不存在"提示
  } else if (error.message.includes('K线数据不足')) {
    // 显示"数据不足"提示
  } else if (error.message.includes('过期')) {
    // 显示"数据过期"警告，但仍展示缓存数据
  } else {
    // 通用错误提示
  }
}
```

### Backend Error Handling

- 使用NestJS的异常过滤器统一处理错误
- 记录所有500错误到日志系统
- 返回用户友好的中文错误消息

---

## Testing

### Contract Validation

```bash
# 使用JSON Schema验证响应格式
npm run test:contract -- vcp-analysis-api
```

### Integration Tests

```typescript
describe('VCP Analysis API', () => {
  it('should return cached analysis for valid stock code', async () => {
    const response = await request(app)
      .get('/api/vcp/605117/analysis')
      .expect(200);
    
    expect(response.body).toMatchObject({
      stockCode: '605117',
      cached: true,
      hasVcp: expect.any(Boolean),
      summary: expect.any(Object),
      contractions: expect.any(Array),
    });
  });
  
  it('should return 404 for non-existent stock', async () => {
    const response = await request(app)
      .get('/api/vcp/999999/analysis')
      .expect(404);
    
    expect(response.body.message).toContain('未找到股票代码');
  });
});
```

---

## Summary

API 合约定义完成，关键点：

1. ✅ **清晰的请求/响应格式**：JSON，字段类型明确
2. ✅ **完整的错误处理**：覆盖所有边界情况（404, 400, 500）
3. ✅ **前端集成示例**：提供 TypeScript 代码示例
4. ✅ **性能指标**：明确响应时间和数据大小目标
5. ✅ **测试指南**：包含合约验证和集成测试示例

**Contract Version**: 1.0.0  
**Status**: Ready for Implementation
