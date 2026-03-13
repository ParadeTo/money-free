# 研究文档：港股和美股核心股票数据支持

**功能**: 005-hk-us-stock-data  
**日期**: 2026-03-12  
**状态**: Phase 0 Complete

## 研究任务概览

本文档记录技术调研结果，解决实施计划中标记为"NEEDS CLARIFICATION"的技术问题，并为关键技术选择提供依据。

## 1. AkShare对港股/美股的支持情况

### 研究问题
AkShare是否支持港股和美股数据？数据完整性和质量如何？

### 调研结果

**港股支持**:
- ✅ AkShare支持港股数据
- API: `stock_hk_spot_em()` - 获取港股实时数据和列表
- API: `stock_hk_hist()` - 获取港股历史K线数据
- API: `index_stock_cons_csindex()` - 获取恒生指数成分股
- 数据完整性: 支持10年以上历史数据
- 数据质量: 来源于东方财富网，数据准确可靠

**美股支持**:
- ✅ AkShare支持美股数据
- API: `stock_us_spot_em()` - 获取美股实时数据和列表
- API: `stock_us_hist()` - 获取美股历史K线数据
- 限制: 美股历史数据可能不如Yahoo Finance完整
- 建议: 美股优先使用Yahoo Finance

**决策**: 
- 港股使用AkShare作为主要数据源
- 美股使用Yahoo Finance作为主要数据源，AkShare作为备选
- 两个数据源都支持，提供灵活性

### 实施建议
```python
# bridge/fetch_hk_klines.py
import akshare as ak

def fetch_hk_klines(symbol, start_date, end_date):
    # symbol格式: "00700" (不带.HK后缀)
    df = ak.stock_hk_hist(symbol=symbol, period="daily", 
                          start_date=start_date, end_date=end_date)
    return df
```

## 2. Yahoo Finance API使用方案

### 研究问题
Yahoo Finance如何获取港股和美股数据？是否有速率限制？

### 调研结果

**访问方式**:
- 使用`yfinance` Python库（社区维护，稳定）
- 或使用`yahoo-finance2` npm包（Node.js原生）

**数据完整性**:
- ✅ 支持全球市场（港股、美股、A股等）
- ✅ 历史数据完整，最长可追溯20-30年
- ✅ 数据免费，无需API密钥

**速率限制**:
- 建议：每秒2-3个请求
- 过快会触发临时封禁（通常持续几分钟）
- 使用p-limit控制并发数为2-3

**股票代码格式**:
- 港股: "0700.HK" (注意：4位数字，Yahoo使用0700不是00700)
- 美股: "AAPL" (无后缀)
- A股: "600519.SS" (上交所), "000001.SZ" (深交所)

**决策**: 使用yfinance Python库作为Yahoo Finance适配器的实现

### 实施建议
```python
# bridge/yahoo_finance_adapter.py
import yfinance as yf
import time

def fetch_yahoo_klines(symbol, start_date, end_date):
    # symbol格式转换: "00700.HK" → "0700.HK"
    ticker = yf.Ticker(symbol)
    df = ticker.history(start=start_date, end=end_date, interval="1d")
    time.sleep(0.4)  # 速率控制：每秒2.5个请求
    return df
```

## 3. 指数成分股列表获取方式

### 研究问题
如何获取恒生指数、恒生科技指数、标普500、纳斯达克100的成分股列表？

### 调研结果

**恒生指数成分股**:
- AkShare API: `index_stock_cons_csindex(symbol="399001")` 
- 或使用: `stock_hk_index_spot_em()` 获取指数列表
- 成分股数量: 约80只

**恒生科技指数成分股**:
- AkShare API: `index_stock_cons_csindex(symbol="HSTECH")` 
- 成分股数量: 约30只
- 总计去重后约110只

**标普500成分股**:
- Wikipedia维护的列表: https://en.wikipedia.org/wiki/List_of_S%26P_500_companies
- 或使用yfinance获取: `yf.Ticker("^GSPC").info`
- 或使用维护好的JSON列表（GitHub上有维护）
- 成分股数量: 500只

**纳斯达克100成分股**:
- Wikipedia列表: https://en.wikipedia.org/wiki/NASDAQ-100
- 或使用Nasdaq官方API
- 成分股数量: 100只
- 与标普500有重叠，去重后约550只

**决策**: 
- 港股: 使用AkShare API获取指数成分股
- 美股: 使用维护好的JSON文件或Wikipedia数据（更稳定）

### 实施建议
```typescript
// backend/src/modules/market-data/import/index-composition.ts

export interface IndexComposition {
  indexName: string;
  market: 'HK' | 'US';
  members: Array<{
    code: string;
    name: string;
  }>;
}

export async function fetchIndexComposition(
  indexName: 'HSI' | 'HSTECH' | 'SP500' | 'NDX100'
): Promise<IndexComposition> {
  // 实现获取逻辑
}
```

## 4. 数据库Schema扩展设计

### 研究问题
如何扩展现有Stock表以支持港股和美股？

### 调研结果

**必需字段扩展**:
```prisma
model Stock {
  // 现有字段保持不变
  stockCode       String   @id
  stockName       String
  market          String   // 扩展值: 'SH' | 'SZ' | 'HK' | 'US'
  
  // 新增字段
  currency        String?  @default("CNY")  // 'CNY' | 'HKD' | 'USD'
  searchKeywords  String?  // JSON: {"zh": [...], "en": [...]}
  
  // 现有关系保持不变
  klines         KLineData[]
  vcpScanResults VcpScanResult[]
}
```

**索引优化**:
```prisma
@@index([market])           // 按市场筛选
@@index([admissionStatus])  // 现有索引保持
```

**数据迁移策略**:
1. 为现有A股记录设置currency='CNY'
2. 为现有A股记录生成searchKeywords（可选）
3. 验证market字段枚举值的完整性

**决策**: 
- 使用currency字段存储货币单位（简单明确）
- 使用searchKeywords字段支持跨语言搜索
- market字段扩展枚举值，向后兼容

### 潜在问题
- **数据库大小**: 660只股票 × 2500条K线 = 1,650,000条新记录
  - 每条约100字节 → 约165MB
  - 加上索引和元数据 → 约300-500MB
  - 现有数据库2.6GB，扩展后约3GB（在可接受范围内）

## 5. 批量导入性能优化

### 研究问题
如何在2-4小时内完成660只股票的10年数据导入？

### 调研结果

**性能瓶颈分析**:
- API请求速率: 每个股票需1-3秒（主要瓶颈）
- 数据库写入: 每只股票2500条记录，批量insert约0.5秒
- 总计: 660只 × 2秒 = 1320秒 ≈ 22分钟（理想情况）
- 实际: 加上失败重试、数据转换 → 预计1-2小时

**优化策略**:

1. **并发控制**:
```typescript
import pLimit from 'p-limit';

const limit = pLimit(3);  // 最多3个并发请求
const promises = stocks.map(stock => 
  limit(() => importStockData(stock))
);
await Promise.all(promises);
```

2. **批量数据库插入**:
```typescript
// 每只股票的2500条K线数据一次性批量插入
await prisma.kLineData.createMany({
  data: klineRecords,  // 2500条记录
  skipDuplicates: true,
});
```

3. **断点续传**:
```typescript
// 检查已导入的股票
const importedStocks = await prisma.stock.findMany({
  where: { market: { in: ['HK', 'US'] } },
  select: { stockCode: true }
});

// 过滤待导入列表
const remainingStocks = allStocks.filter(
  s => !importedStocks.some(i => i.stockCode === s.code)
);
```

**决策**: 
- 使用3个并发请求（平衡速度和API限制）
- 使用createMany批量插入K线数据
- 基于数据库状态自动实现断点续传

### 性能预测
- 港股（110只）: 110 × 2秒 / 3并发 ≈ 73秒 + 数据库写入 ≈ 10-15分钟
- 美股（550只）: 550 × 2秒 / 3并发 ≈ 367秒 ≈ 6分钟 + 数据库写入 ≈ 30-40分钟
- **实际可能更快**，远低于2-4小时的目标

## 6. 跨语言搜索实现方案

### 研究问题
如何实现用户输入中文"苹果"匹配英文股票名"Apple"？

### 调研结果

**方案对比**:

| 方案 | 优点 | 缺点 | 复杂度 |
|------|------|------|--------|
| A. 实时翻译API | 支持任意查询 | 慢、依赖外部服务、成本 | 中 |
| B. 搜索关键词表 | 快速、离线、可控 | 需手动维护 | 低 |
| C. 全文搜索引擎 | 强大、灵活 | 过度设计、引入新依赖 | 高 |
| D. 双语字段存储 | 简单直接 | 需要两个字段、数据量大 | 低 |

**决策**: 方案B - 搜索关键词表

**实施细节**:
```typescript
// Stock表扩展
searchKeywords: string | null  // JSON格式

// 示例数据
{
  "00700.HK": {
    "zh": ["腾讯", "腾讯控股"],
    "en": ["Tencent", "Tencent Holdings"]
  },
  "AAPL.US": {
    "zh": ["苹果", "苹果公司"],
    "en": ["Apple", "Apple Inc"]
  }
}

// 查询逻辑
const searchTerm = "苹果";
const stocks = await prisma.stock.findMany({
  where: {
    OR: [
      { stockName: { contains: searchTerm } },
      { stockCode: { contains: searchTerm } },
      { searchKeywords: { contains: searchTerm } }
    ]
  }
});
```

**关键词来源**:
1. 自动生成: 从股票全名提取常用简称
2. 手动维护: 为常用股票添加中英文对照
3. 用户贡献: 未来可考虑让用户添加自定义关键词

**初期策略**: 
- 为标普500成分股（如AAPL, MSFT, GOOGL等）预置中文关键词
- 其他股票先不设置，后续根据用户搜索行为补充

## 7. 断点续传检查点设计

### 研究问题
如何设计可靠的断点续传机制？

### 调研结果

**检查点策略对比**:

| 策略 | 检查点判断 | 优点 | 缺点 |
|------|-----------|------|------|
| 文件检查点 | 读取checkpoint.json文件 | 显式状态 | 需同步文件和数据库 |
| 数据库状态 | 查询已导入的股票记录 | 单一数据源、简单 | 需完整性检查 |
| ImportTask表 | 专用任务状态表 | 历史追踪 | 额外维护成本 |

**决策**: 数据库状态检查（方案2）

**实施逻辑**:
```typescript
// 1. 检查股票基本信息是否存在
const stockExists = await prisma.stock.findUnique({
  where: { stockCode: '00700.HK' }
});

// 2. 检查K线数据完整性
const klineCount = await prisma.kLineData.count({
  where: { 
    stockCode: '00700.HK',
    period: 'daily'
  }
});

// 3. 判断是否需要导入
const needsImport = !stockExists || klineCount < 2400;  // 10年约2500个交易日

// 4. 如果部分数据缺失，查询最新K线日期
if (stockExists && klineCount > 0) {
  const latestKline = await prisma.kLineData.findFirst({
    where: { stockCode: '00700.HK', period: 'daily' },
    orderBy: { date: 'desc' }
  });
  // 从latestKline.date之后继续导入
}
```

**完整性判断标准**:
- 基本信息存在
- K线数据数量 >= 2400 (10年 × 250个交易日/年，留10%容错)
- 最新K线日期距今 <= 7天

**决策理由**:
- 利用数据库作为单一真实数据源
- 自动支持部分导入（补充缺失数据）
- 无需维护额外的状态文件

## 8. 港股/美股股票名称规范化

### 研究问题
港股和美股的股票名称格式不统一，如何标准化存储？

### 调研结果

**港股命名特点**:
- 通常为中文名称："腾讯控股"、"阿里巴巴-SW"
- 部分包含英文后缀："-SW"（同股不同权）、"-R"（人民币计价）
- 数据源通常提供中文名

**美股命名特点**:
- 英文全称："Apple Inc.", "Microsoft Corporation"
- 简称在交易时使用："Apple"（非正式）
- 正式名称包含公司类型后缀（Inc., Corp., LLC等）

**决策**: 
- 按数据源原始名称存储（不翻译、不缩写）
- 港股: 存储中文名称（如"腾讯控股"）
- 美股: 存储英文全称（如"Apple Inc."）
- 通过searchKeywords字段支持中英文检索

**标准化规则**:
```typescript
interface StockNameFormat {
  original: string;      // 原始名称（数据源提供）
  display: string;       // 显示名称（= original）
  searchKeywords: {      // 搜索关键词
    zh: string[];        // 中文关键词
    en: string[];        // 英文关键词
  };
}

// 示例
{
  "00700.HK": {
    original: "腾讯控股",
    display: "腾讯控股",
    searchKeywords: {
      zh: ["腾讯", "腾讯控股"],
      en: ["Tencent", "Tencent Holdings"]
    }
  },
  "AAPL.US": {
    original: "Apple Inc.",
    display: "Apple Inc.",
    searchKeywords: {
      zh: ["苹果", "苹果公司"],
      en: ["Apple", "AAPL"]
    }
  }
}
```

## 9. 数据源失败处理策略

### 研究问题
当AkShare和Yahoo Finance都失败时，如何保证导入流程的健壮性？

### 调研结果

**失败场景**:
1. 网络超时（timeout > 30秒）
2. API限流（429 Too Many Requests）
3. 股票代码不存在（404）
4. 数据格式错误（解析失败）
5. 服务暂时不可用（500/503）

**重试策略**:
```typescript
async function fetchWithRetry(
  fetcher: () => Promise<any>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 指数退避
      await sleep(delayMs * Math.pow(2, i));
    }
  }
}
```

**错误分类和处理**:
- **可重试错误** (timeout, 429, 500, 503): 自动重试3次
- **不可重试错误** (404, 403, 数据格式错误): 立即跳过，记录日志
- **数据源切换**: 主数据源3次重试后，切换到备用数据源

**失败日志格式**:
```typescript
interface ImportError {
  stockCode: string;
  timestamp: Date;
  attemptedSources: Array<{
    source: 'akshare' | 'yahoo_finance';
    errorType: string;
    errorMessage: string;
    retryCount: number;
  }>;
}
```

**决策**: 
- 实现智能重试机制（指数退避）
- 区分可重试和不可重试错误
- 记录详细的失败日志供人工排查

## 10. VCP分析算法市场适配性

### 研究问题
港股和美股的波动性是否需要调整VCP分析参数？

### 调研结果

**市场特性对比**:

| 特性 | A股 | 港股 | 美股 |
|------|-----|------|------|
| 涨跌幅限制 | ±10% (ST股±5%) | 无限制 | 无限制 |
| 交易时间 | 4小时/天 | 6.5小时/天 | 6.5小时/天 |
| 波动性 | 较高 | 中等 | 中等-高 |
| 流动性 | 中等 | 高（大盘股） | 高 |

**VCP参数影响分析**:
- **收缩幅度阈值**: A股使用15-35%，港股美股可能需要调整至10-30%（无涨跌幅限制，收缩可能更紧）
- **收缩持续时间**: 可以保持统一标准（5-30天）
- **成交量萎缩判断**: 统一标准适用

**决策**: 
- **第一阶段**: 使用与A股相同的参数，观察效果
- **第二阶段**: 根据实际VCP扫描结果调整参数（如果准确率不达标）
- **配置化**: 将VCP参数配置化，便于后续调整

**实施建议**:
```typescript
// backend/src/modules/vcp/vcp-config.ts
interface VcpConfig {
  market: 'SH' | 'SZ' | 'HK' | 'US';
  contractionThresholds: {
    min: number;  // 15% (A股) or 10% (HK/US)
    max: number;  // 35% (A股) or 30% (HK/US)
  };
  minContractions: number;  // 统一: 2-3次
  volumeDecreaseThreshold: number;  // 统一: 30%
}

const vcpConfigs: Record<string, VcpConfig> = {
  'SH': { /* A股配置 */ },
  'SZ': { /* A股配置 */ },
  'HK': { /* 港股配置 - 初期与A股相同 */ },
  'US': { /* 美股配置 - 初期与A股相同 */ },
};
```

## 研究结论

### 关键技术选择

| 领域 | 选择 | 原因 |
|------|------|------|
| 港股数据源 | AkShare（主）+ Yahoo Finance（备） | AkShare对港股支持完善，Yahoo Finance作为保险 |
| 美股数据源 | Yahoo Finance（主）+ AkShare（备） | Yahoo Finance美股数据更完整 |
| 指数成分股 | AkShare API（港股）+ JSON文件（美股） | 稳定性和可维护性 |
| 断点续传 | 基于数据库状态 | 简单可靠，无需额外状态管理 |
| 跨语言搜索 | searchKeywords字段 | 性能好，实现简单 |
| VCP参数 | 初期统一，后续可配置化 | 快速上线，保留调整空间 |
| 并发控制 | p-limit (concurrency=3) | 平衡速度和API限制 |

### 未解决问题（Phase 1或Phase 2处理）

- **搜索关键词初始化**: 如何为660只股票生成初始的searchKeywords？
  - 建议: 使用预定义的常用股票关键词表（前100只热门股票）
  - 其他股票初期不设置，根据用户反馈补充

- **数据源API密钥管理**: Yahoo Finance和AkShare是否需要API密钥？
  - AkShare: 免费，无需密钥
  - Yahoo Finance: 免费，无需密钥（使用yfinance库）
  - 结论: 无需密钥管理

### 风险缓解确认

所有Phase 0识别的风险都有明确的缓解措施：
- ✅ 数据源可靠性 → 双数据源策略
- ✅ 导入中断 → 断点续传机制
- ✅ API限流 → 并发控制和重试机制
- ✅ 数据库容量 → 已评估增长在可接受范围内
- ✅ 跨语言搜索 → searchKeywords字段方案

## 下一步

Phase 0研究完成，所有技术不确定性已解决。

继续Phase 1: 创建data-model.md和contracts/。
