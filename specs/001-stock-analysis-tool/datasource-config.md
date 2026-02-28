# 数据源配置指南

**功能**: 股票分析工具  
**日期**: 2026-02-28  
**状态**: 数据源配置说明

## 概述

本文档说明如何配置和使用股票数据源。系统采用 **Tushare Pro (主) + AkShare (备)** 的双数据源策略，确保数据获取的可靠性。

---

## 数据源架构

```
┌─────────────────────────────────────────┐
│          数据获取服务层                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   数据源适配器 (DataSource)       │  │
│  │                                   │  │
│  │  ┌─────────────┐  ┌────────────┐ │  │
│  │  │ Tushare Pro │  │  AkShare   │ │  │
│  │  │   (主源)    │  │   (备源)   │ │  │
│  │  └──────┬──────┘  └──────┬─────┘ │  │
│  │         │                │       │  │
│  │         └────────┬───────┘       │  │
│  │              自动降级             │  │
│  └──────────────────┬────────────────┘  │
│                     │                   │
│  ┌──────────────────▼────────────────┐  │
│  │     数据格式标准化转换层           │  │
│  └──────────────────┬────────────────┘  │
└────────────────────┬────────────────────┘
                     │
                     ▼
              统一数据模型
```

---

## 0. 股票准入标准

**重要**: 系统不支持全部A股，通过准入标准筛选约1000只优质股票。

### 准入标准

- ✅ 市值 > 50亿元
- ✅ 日均成交额 > 1000万元
- ✅ 排除 ST、*ST 股票
- ✅ 上市时间 > 5年

**效果**: 从5000只A股筛选出约1000只，存储从60GB降到12-15GB

详细说明见 [admission-criteria.md](./admission-criteria.md)

---

## 1. Tushare Pro 配置 (主数据源)

### 1.1 注册账号

1. 访问 https://tushare.pro/register
2. 使用手机号或邮箱注册（免费）
3. 完成注册后自动获得 120 积分

### 1.2 获取 Token

1. 登录后访问 https://tushare.pro/user/token
2. 复制你的 Token (32位字符串)
3. 示例: `1234567890abcdef1234567890abcdef`

### 1.3 配置到项目

在 `backend/.env` 文件中添加:

```bash
TUSHARE_TOKEN=your-actual-token-here
```

### 1.4 验证配置

运行测试脚本:

```bash
cd backend
npm run test:tushare
```

成功输出:
```
✓ Tushare Pro 连接成功
✓ Token 有效
✓ 剩余调用次数: 500
✓ 当前积分: 120
```

**Node.js 实现示例**:

```typescript
// backend/src/services/datasource/tushare.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TushareService {
  private readonly logger = new Logger(TushareService.name);
  private readonly baseURL = 'http://api.waditu.com';
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
    this.token = this.config.get<string>('TUSHARE_TOKEN');
  }

  async getDailyKLine(tsCode: string, startDate: string, endDate: string) {
    const response = await firstValueFrom(
      this.http.post(this.baseURL, {
        api_name: 'daily',
        token: this.token,
        params: { ts_code: tsCode, start_date: startDate, end_date: endDate },
        fields: 'ts_code,trade_date,open,high,low,close,vol,amount'
      })
    );
    
    if (response.data.code !== 0) {
      throw new Error(`Tushare API error: ${response.data.msg}`);
    }
    
    return response.data.data.items;
  }
}
```

---

## 2. AkShare 配置 (备用数据源 - Python Bridge)

### 2.1 安装

AkShare 通过 Python Bridge 调用，需要在 `bridge/` 目录安装:

```bash
cd bridge
pip install -r requirements.txt
```

**requirements.txt** 包含:
```txt
akshare==1.12.0
pandas==2.1.0
```

### 2.2 配置

**无需配置**，AkShare 完全免费，无需注册或 token。

### 2.3 验证

```bash
# 测试 Python Bridge
cd bridge
python akshare_fetcher.py '{"code":"600519","start":"2024-01-01","end":"2024-12-31"}'
```

**Node.js 调用示例**:

```typescript
// backend/src/services/datasource/akshare.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PythonBridgeService } from '../python-bridge/python-bridge.service';

@Injectable()
export class AkShareService {
  private readonly logger = new Logger(AkShareService.name);

  constructor(private readonly bridge: PythonBridgeService) {}

  async getDailyKLine(stockCode: string, startDate: string, endDate: string) {
    try {
      const result = await this.bridge.execute('akshare_fetcher.py', {
        code: stockCode,
        start: startDate,
        end: endDate
      });
      
      return result;
    } catch (error) {
      this.logger.error(`AkShare fetch failed: ${error.message}`);
      throw error;
    }
  }
}
```

---

## 3. 数据源降级策略

### 3.1 降级触发条件

系统在以下情况自动从 Tushare Pro 降级到 AkShare:

1. **额度耗尽**: Tushare Pro 当日调用次数超过 500 次
2. **网络错误**: 连续 3 次请求失败
3. **API 错误**: Tushare 服务不可用 (HTTP 5xx)
4. **Token 无效**: Token 过期或错误

### 3.2 降级流程

**Node.js + TypeScript 实现示例**:

```typescript
// backend/src/services/datasource/datasource-manager.service.ts
async fetchStockData(stockCode: string, startDate: string, endDate: string) {
  // 1. 尝试 Tushare Pro (主数据源 - HTTP 直接调用)
  try {
    const data = await this.tushare.getDailyKLine(stockCode, startDate, endDate);
    this.logger.log(`Success: Tushare Pro | ${stockCode}`);
    return this.normalizeData(data, 'tushare');
  } catch (error) {
    if (error.message.includes('quota')) {
      this.logger.warn('Tushare quota exceeded, switching to AkShare');
    } else {
      this.logger.error(`Tushare API error: ${error.message}, switching to AkShare`);
    }
  }
  
  // 2. 降级到 AkShare (备用数据源 - Python Bridge)
  try {
    const data = await this.akshare.getDailyKLine(stockCode, startDate, endDate);
    this.logger.log(`Success: AkShare | ${stockCode}`);
    return this.normalizeData(data, 'akshare');
  } catch (error) {
    this.logger.error(`All data sources failed: ${error.message}`);
    throw new DataSourceUnavailableException(stockCode);
  }
}

private normalizeData(data: any[], source: 'tushare' | 'akshare') {
  return data.map(item => ({
    date: item.trade_date || item.date,
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
    volume: parseFloat(item.vol || item.volume),
    amount: parseFloat(item.amount),
    source
  }));
}
```

### 3.3 恢复机制

- 每小时检查一次 Tushare Pro 可用性
- 如果 Tushare Pro 恢复，自动切换回主数据源
- 记录每次切换事件到日志

---

## 4. API 调用额度管理

### 4.1 Tushare Pro 额度

| 用户类型 | 每日调用次数 | 积分要求 |
|---------|-------------|---------|
| 免费用户 | 500 次/天 | 120 积分（注册即得） |
| 认证用户 | 2000 次/天 | 完成实名认证 |
| VIP 用户 | 10000 次/天 | 购买会员 |

### 4.2 额度优化策略

#### 初始数据下载 (一次性)

```bash
# 分批下载历史数据，避免一次性消耗太多
python scripts/fetch_historical_klines.py \
  --batch-size 50 \        # 每批 50 只股票
  --delay 2 \              # 每批间隔 2 秒
  --use-cache              # 启用缓存，避免重复请求
```

**预估**: 1000 只股票 × 20 年数据 ≈ 需要 2-3 天完成（每天 500 次）

#### 每日更新 (日常)

```bash
# 只更新当日新增数据
python scripts/daily_update.py --only-today
```

**预估**: 约 1000 次调用（每只符合准入标准的股票 1 次）

**优化方案**:
1. 只更新符合准入标准的股票（约1000只）
2. 每月重新评估准入标准，动态调整股票池
3. 使用 AkShare 作为补充数据源
4. 排除停牌股票（临时跳过）

### 4.3 额度监控

系统自动监控 API 调用情况:

```python
# 实时监控
GET /api/v1/system/datasource/status

# 响应示例
{
  "tushare": {
    "status": "available",
    "quota_used": 234,
    "quota_remaining": 266,
    "points": 120,
    "last_call": "2026-02-28T10:30:00Z"
  },
  "akshare": {
    "status": "available",
    "fallback_count_today": 5
  }
}
```

---

## 5. 数据格式标准化

### 5.1 Tushare Pro 原始格式

```python
# Tushare Pro 返回示例
{
    "ts_code": "600519.SH",
    "trade_date": "20260228",
    "open": 1580.00,
    "high": 1595.50,
    "low": 1575.00,
    "close": 1590.00,
    "vol": 12345600,    # 单位: 手
    "amount": 1956789   # 单位: 千元
}
```

### 5.2 AkShare 原始格式

```python
# AkShare 返回示例
{
    "日期": "2026-02-28",
    "股票代码": "600519",
    "开盘": 1580.00,
    "最高": 1595.50,
    "最低": 1575.00,
    "收盘": 1590.00,
    "成交量": 123456,     # 单位: 手
    "成交额": 195678900   # 单位: 元
}
```

### 5.3 统一标准格式

```python
# 系统内部统一格式
{
    "stock_code": "600519",
    "trade_date": "2026-02-28",
    "open": 1580.00,
    "high": 1595.50,
    "low": 1575.00,
    "close": 1590.00,
    "volume": 123456,      # 统一单位: 手
    "amount": 195678900.00, # 统一单位: 元
    "source": "tushare"    # 数据来源标记
}
```

### 5.4 转换实现

```python
# backend/src/services/datasource/normalizer.py

class DataNormalizer:
    @staticmethod
    def normalize_tushare(data: dict) -> dict:
        """Tushare Pro 格式转换"""
        return {
            "stock_code": data["ts_code"].split(".")[0],
            "trade_date": datetime.strptime(data["trade_date"], "%Y%m%d").date(),
            "open": Decimal(data["open"]),
            "high": Decimal(data["high"]),
            "low": Decimal(data["low"]),
            "close": Decimal(data["close"]),
            "volume": data["vol"],
            "amount": Decimal(data["amount"]) * 1000,  # 千元 -> 元
            "source": "tushare"
        }
    
    @staticmethod
    def normalize_akshare(data: dict) -> dict:
        """AkShare 格式转换"""
        return {
            "stock_code": data["股票代码"],
            "trade_date": data["日期"],
            "open": Decimal(data["开盘"]),
            "high": Decimal(data["最高"]),
            "low": Decimal(data["最低"]),
            "close": Decimal(data["收盘"]),
            "volume": data["成交量"],
            "amount": Decimal(data["成交额"]),
            "source": "akshare"
        }
```

---

## 6. 数据质量验证

### 6.1 自动验证规则

```python
def validate_kline_data(data: dict) -> bool:
    """K线数据质量验证"""
    checks = [
        data["high"] >= data["open"],
        data["high"] >= data["close"],
        data["high"] >= data["low"],
        data["low"] <= data["open"],
        data["low"] <= data["close"],
        data["volume"] >= 0,
        data["amount"] >= 0,
    ]
    return all(checks)
```

### 6.2 数据对比

定期对比两个数据源的数据一致性:

```bash
python scripts/compare_datasources.py \
  --stock 600519 \
  --date 2026-02-28
```

输出:
```
✓ 开盘价一致: 1580.00
✓ 收盘价一致: 1590.00
⚠ 成交量差异: Tushare: 123456, AkShare: 123450 (差异 < 0.01%)
```

---

## 7. 故障排查

### 问题 1: Tushare Token 无效

**症状**: 
```
ERROR: Tushare authentication failed
```

**解决**:
1. 检查 `.env` 文件中的 `TUSHARE_TOKEN` 是否正确
2. 访问 https://tushare.pro/user/token 重新复制 token
3. 确认 token 没有多余的空格或换行符
4. 重启后端服务

### 问题 2: Tushare 额度耗尽

**症状**:
```
WARNING: Tushare quota exceeded, switching to AkShare
```

**解决**:
1. 等待第二天凌晨额度重置
2. 系统自动使用 AkShare，无需干预
3. 长期方案: 完成实名认证提升额度到 2000 次/天

### 问题 3: AkShare 数据获取失败

**症状**:
```
ERROR: AkShare fetch failed: Connection timeout
```

**解决**:
1. 检查网络连接
2. AkShare 依赖网页爬虫，可能偶尔失败，重试即可
3. 如果持续失败，等待 Tushare Pro 额度恢复

### 问题 4: 数据不一致

**症状**: 两个数据源返回的数据有差异

**解决**:
1. 轻微差异(< 0.1%)属于正常，不同数据源采集时间可能略有差异
2. 优先使用 Tushare Pro 数据（质量更高）
3. 运行数据对比脚本: `python scripts/compare_datasources.py`

---

## 8. 最佳实践

### 8.1 开发阶段

- 使用 AkShare 进行开发测试，节省 Tushare 额度
- 只在需要高质量数据时切换到 Tushare Pro

### 8.2 生产部署

- 主数据源: Tushare Pro (数据质量最好)
- 备用方案: AkShare 自动降级
- 定期监控 API 调用情况

### 8.3 额度优化

- 缓存机制: 相同查询1小时内返回缓存结果
- 批量获取: 一次请求获取多只股票数据
- 增量更新: 只更新新增数据，避免重复获取

---

## 9. 参考资源

- [Tushare Pro 官方文档](https://tushare.pro/document/2)
- [AkShare 官方文档](https://akshare.akfamily.xyz/)
- [项目数据模型设计](./data-model.md)
- [API 接口规范](./contracts/api-spec.md)

---

## 总结

数据源配置完成后，系统将具备：

✅ **高质量数据**: Tushare Pro 专业数据  
✅ **高可用性**: AkShare 自动备份  
✅ **智能降级**: 自动切换数据源  
✅ **格式统一**: 标准化数据模型  
✅ **质量保证**: 自动验证和监控

开始使用前请确保完成 Tushare Pro 注册并配置 token！
