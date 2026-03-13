# 数据源API接口契约

**功能**: 005-hk-us-stock-data  
**版本**: 1.0.0  
**日期**: 2026-03-12

## 概述

本文档定义数据源适配器的统一接口规范。所有数据源（AkShare、Yahoo Finance）必须实现此接口，确保上层ImportManager可以透明地切换数据源。

## 核心接口

### IDataSourceAdapter

```typescript
export interface IDataSourceAdapter {
  /**
   * 数据源名称
   */
  readonly name: 'akshare' | 'yahoo_finance';
  
  /**
   * 获取指数成分股列表
   * @param indexCode 指数代码 ('HSI' | 'HSTECH' | 'SP500' | 'NDX100')
   * @returns 成分股列表
   * @throws DataSourceError
   */
  fetchIndexConstituents(indexCode: string): Promise<IndexConstituent[]>;
  
  /**
   * 获取股票基本信息
   * @param symbol 股票代码（不带市场后缀，如"00700"或"AAPL"）
   * @param market 市场类型
   * @returns 股票基本信息
   * @throws DataSourceError
   */
  fetchStockInfo(symbol: string, market: MarketType): Promise<StockInfo>;
  
  /**
   * 获取历史K线数据
   * @param symbol 股票代码（不带市场后缀）
   * @param market 市场类型
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   * @returns K线数据数组（按日期升序）
   * @throws DataSourceError
   */
  fetchKlineData(
    symbol: string,
    market: MarketType,
    startDate: string,
    endDate: string
  ): Promise<KlineRecord[]>;
  
  /**
   * 检查数据源是否可用
   * @returns 可用性状态
   */
  checkAvailability(): Promise<boolean>;
}
```

## 数据类型定义

### IndexConstituent (指数成分股)

```typescript
export interface IndexConstituent {
  /**
   * 股票代码（不带市场后缀）
   * 港股: "00700", "09988"
   * 美股: "AAPL", "MSFT"
   */
  code: string;
  
  /**
   * 股票名称（原语言）
   * 港股: "腾讯控股"
   * 美股: "Apple Inc."
   */
  name: string;
  
  /**
   * 权重（可选，百分比）
   * 例如: 8.5 表示占指数8.5%
   */
  weight?: number;
}
```

### StockInfo (股票基本信息)

```typescript
export interface StockInfo {
  /**
   * 股票代码（不带市场后缀）
   */
  code: string;
  
  /**
   * 股票名称（原语言）
   */
  name: string;
  
  /**
   * 市场类型
   */
  market: MarketType;
  
  /**
   * 货币单位
   */
  currency: CurrencyType;
  
  /**
   * 所属行业（可选）
   */
  industry?: string;
  
  /**
   * 上市日期（ISO格式: YYYY-MM-DD）
   */
  listDate: string;
  
  /**
   * 市值（单位：亿，可选）
   */
  marketCap?: number;
}
```

### KlineRecord (K线数据)

```typescript
export interface KlineRecord {
  /**
   * 日期 (ISO格式: YYYY-MM-DD)
   */
  date: string;
  
  /**
   * 开盘价
   */
  open: number;
  
  /**
   * 最高价
   */
  high: number;
  
  /**
   * 最低价
   */
  low: number;
  
  /**
   * 收盘价
   */
  close: number;
  
  /**
   * 成交量（单位：股）
   */
  volume: number;
  
  /**
   * 成交额（单位：原币种）
   */
  amount: number;
}
```

### DataSourceError (错误类型)

```typescript
export class DataSourceError extends Error {
  constructor(
    public readonly source: 'akshare' | 'yahoo_finance',
    public readonly errorType: ErrorType,
    public readonly originalError: any,
    message: string
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export enum ErrorType {
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',       // 网络超时
  RATE_LIMIT = 'RATE_LIMIT',                 // API限流
  INVALID_SYMBOL = 'INVALID_SYMBOL',         // 无效股票代码
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',         // 数据不存在
  PARSE_ERROR = 'PARSE_ERROR',               // 数据解析错误
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 服务不可用
  UNKNOWN = 'UNKNOWN',                       // 未知错误
}
```

## 适配器实现规范

### AkShareAdapter

```typescript
export class AkShareAdapter implements IDataSourceAdapter {
  readonly name = 'akshare' as const;
  
  /**
   * 通过Python bridge调用AkShare
   */
  private async callPythonBridge(
    scriptName: string,
    args: any
  ): Promise<any> {
    // 调用bridge/目录下的Python脚本
  }
  
  async fetchIndexConstituents(indexCode: string): Promise<IndexConstituent[]> {
    // 调用 bridge/fetch_index_constituents.py
    const result = await this.callPythonBridge('fetch_index_constituents', {
      index: indexCode
    });
    return result.data;
  }
  
  async fetchStockInfo(symbol: string, market: MarketType): Promise<StockInfo> {
    if (market === 'HK') {
      // 调用 bridge/fetch_hk_stock_info.py
    } else if (market === 'US') {
      // 调用 bridge/fetch_us_stock_info.py
    }
  }
  
  async fetchKlineData(
    symbol: string,
    market: MarketType,
    startDate: string,
    endDate: string
  ): Promise<KlineRecord[]> {
    // 调用对应的K线数据获取脚本
  }
  
  async checkAvailability(): Promise<boolean> {
    try {
      // 尝试获取测试数据
      await this.callPythonBridge('test_connection', {});
      return true;
    } catch {
      return false;
    }
  }
}
```

### YahooFinanceAdapter

```typescript
export class YahooFinanceAdapter implements IDataSourceAdapter {
  readonly name = 'yahoo_finance' as const;
  
  private async callPythonBridge(
    scriptName: string,
    args: any
  ): Promise<any> {
    // 调用bridge/yahoo_finance_*.py脚本
  }
  
  async fetchIndexConstituents(indexCode: string): Promise<IndexConstituent[]> {
    // SP500和NDX100从预定义JSON文件读取
    const constituentsFile = `./data/index-constituents/${indexCode}.json`;
    return JSON.parse(fs.readFileSync(constituentsFile, 'utf-8'));
  }
  
  async fetchStockInfo(symbol: string, market: MarketType): Promise<StockInfo> {
    // 调用 bridge/yahoo_finance_stock_info.py
    const result = await this.callPythonBridge('yahoo_finance_stock_info', {
      symbol: this.formatSymbol(symbol, market),
      market
    });
    return this.parseStockInfo(result);
  }
  
  async fetchKlineData(
    symbol: string,
    market: MarketType,
    startDate: string,
    endDate: string
  ): Promise<KlineRecord[]> {
    // 调用 bridge/yahoo_finance_klines.py
    const formattedSymbol = this.formatSymbol(symbol, market);
    const result = await this.callPythonBridge('yahoo_finance_klines', {
      symbol: formattedSymbol,
      start: startDate,
      end: endDate
    });
    return this.parseKlineData(result);
  }
  
  /**
   * 格式化股票代码为Yahoo Finance格式
   * 港股: "00700" → "0700.HK"
   * 美股: "AAPL" → "AAPL"
   */
  private formatSymbol(symbol: string, market: MarketType): string {
    if (market === 'HK') {
      // 去掉前导0: "00700" → "0700"
      return symbol.replace(/^0+/, '0') + '.HK';
    } else if (market === 'US') {
      return symbol;  // 保持原样
    }
    throw new Error(`Unsupported market: ${market}`);
  }
  
  async checkAvailability(): Promise<boolean> {
    try {
      // 测试查询一个已知存在的股票
      await this.fetchStockInfo('AAPL', 'US');
      return true;
    } catch {
      return false;
    }
  }
}
```

## 错误处理契约

### 错误类型

所有数据源适配器必须抛出`DataSourceError`，并正确设置`errorType`：

```typescript
// 示例：处理网络超时
try {
  const response = await axios.get(url, { timeout: 30000 });
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    throw new DataSourceError(
      'akshare',
      ErrorType.NETWORK_TIMEOUT,
      error,
      `Network timeout after 30s for stock ${symbol}`
    );
  }
}

// 示例：处理API限流
if (response.status === 429) {
  throw new DataSourceError(
    'yahoo_finance',
    ErrorType.RATE_LIMIT,
    response,
    'API rate limit exceeded, please retry later'
  );
}

// 示例：处理股票代码不存在
if (response.status === 404) {
  throw new DataSourceError(
    'akshare',
    ErrorType.INVALID_SYMBOL,
    response,
    `Stock ${symbol} not found in ${market} market`
  );
}
```

### 可重试判断

```typescript
export function isRetryableError(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK_TIMEOUT,
    ErrorType.RATE_LIMIT,
    ErrorType.SERVICE_UNAVAILABLE,
  ].includes(errorType);
}
```

## 性能要求

### 响应时间

| 方法 | 目标响应时间 | 超时设置 |
|------|------------|---------|
| fetchIndexConstituents | <10秒 | 30秒 |
| fetchStockInfo | <2秒 | 10秒 |
| fetchKlineData (10年) | <5秒 | 30秒 |
| checkAvailability | <3秒 | 10秒 |

### 并发限制

```typescript
// 每个适配器实例的并发限制
const ADAPTER_CONCURRENCY = 3;

// 全局速率限制（所有适配器共享）
const GLOBAL_RATE_LIMIT = 5;  // 每秒最多5个请求
```

## 数据质量契约

### 必需字段验证

**StockInfo**:
- `code`, `name`, `market`, `currency`: 必需，非空
- `listDate`: 必需，格式为YYYY-MM-DD
- `industry`, `marketCap`: 可选

**KlineRecord**:
- 所有字段必需
- 价格字段: `open`, `high`, `low`, `close` > 0
- 约束: `low <= open <= high && low <= close <= high`
- `volume >= 0`, `amount >= 0`
- `date`: 格式为YYYY-MM-DD

### 数据完整性

```typescript
export function validateKlineRecord(record: KlineRecord): boolean {
  // 基本非空检查
  if (!record.date || record.open <= 0 || record.high <= 0 
      || record.low <= 0 || record.close <= 0) {
    return false;
  }
  
  // 价格逻辑检查
  if (record.low > record.high) return false;
  if (record.open > record.high || record.open < record.low) return false;
  if (record.close > record.high || record.close < record.low) return false;
  
  // 成交量非负
  if (record.volume < 0 || record.amount < 0) return false;
  
  return true;
}
```

### 数据排序

- `fetchIndexConstituents`: 返回结果按股票代码升序排序
- `fetchKlineData`: 返回结果按日期升序排序（最早的日期在前）

## 测试契约

### Mock数据规范

所有适配器测试必须提供mock数据：

```typescript
// tests/mocks/data-source-mock.ts

export const MOCK_HK_STOCK_INFO: StockInfo = {
  code: '00700',
  name: '腾讯控股',
  market: 'HK',
  currency: 'HKD',
  industry: '互联网',
  listDate: '2004-06-16',
  marketCap: 35000
};

export const MOCK_US_STOCK_INFO: StockInfo = {
  code: 'AAPL',
  name: 'Apple Inc.',
  market: 'US',
  currency: 'USD',
  industry: 'Technology',
  listDate: '1980-12-12',
  marketCap: 28000
};

export const MOCK_KLINE_DATA: KlineRecord[] = [
  {
    date: '2026-03-10',
    open: 385.0,
    high: 392.0,
    low: 383.0,
    close: 390.5,
    volume: 25000000,
    amount: 9750000000
  },
  // ... 更多记录
];
```

### 单元测试要求

每个适配器实现必须通过以下测试：

```typescript
describe('DataSourceAdapter', () => {
  it('应该成功获取指数成分股列表', async () => {
    const adapter = new AkShareAdapter();
    const constituents = await adapter.fetchIndexConstituents('HSI');
    
    expect(constituents.length).toBeGreaterThan(0);
    expect(constituents[0]).toHaveProperty('code');
    expect(constituents[0]).toHaveProperty('name');
  });
  
  it('应该成功获取股票基本信息', async () => {
    const adapter = new AkShareAdapter();
    const info = await adapter.fetchStockInfo('00700', 'HK');
    
    expect(info.code).toBe('00700');
    expect(info.market).toBe('HK');
    expect(info.currency).toBe('HKD');
  });
  
  it('应该成功获取历史K线数据', async () => {
    const adapter = new AkShareAdapter();
    const klines = await adapter.fetchKlineData(
      '00700', 'HK', '2016-01-01', '2026-12-31'
    );
    
    expect(klines.length).toBeGreaterThan(2000);  // 10年约2500条
    expect(klines[0].date).toBeLessThan(klines[klines.length - 1].date);
  });
  
  it('应该在股票代码无效时抛出错误', async () => {
    const adapter = new AkShareAdapter();
    
    await expect(
      adapter.fetchStockInfo('INVALID', 'HK')
    ).rejects.toThrow(DataSourceError);
  });
  
  it('应该正确分类错误类型', async () => {
    const adapter = new AkShareAdapter();
    
    try {
      await adapter.fetchStockInfo('INVALID', 'HK');
    } catch (error) {
      expect(error).toBeInstanceOf(DataSourceError);
      expect(error.errorType).toBe(ErrorType.INVALID_SYMBOL);
      expect(error.source).toBe('akshare');
    }
  });
});
```

## 数据格式示例

### fetchIndexConstituents 响应示例

```json
[
  {
    "code": "00700",
    "name": "腾讯控股",
    "weight": 8.5
  },
  {
    "code": "09988",
    "name": "阿里巴巴-SW",
    "weight": 7.2
  }
]
```

### fetchStockInfo 响应示例

```json
{
  "code": "00700",
  "name": "腾讯控股",
  "market": "HK",
  "currency": "HKD",
  "industry": "互联网",
  "listDate": "2004-06-16",
  "marketCap": 35000.0
}
```

### fetchKlineData 响应示例

```json
[
  {
    "date": "2016-01-04",
    "open": 138.5,
    "high": 142.0,
    "low": 137.8,
    "close": 141.2,
    "volume": 18500000,
    "amount": 2598000000
  },
  {
    "date": "2016-01-05",
    "open": 141.0,
    "high": 145.5,
    "low": 140.2,
    "close": 144.8,
    "volume": 22000000,
    "amount": 3154000000
  }
]
```

## 版本控制

**当前版本**: 1.0.0

**版本规则**:
- 破坏性变更（修改接口签名）: 主版本号+1
- 新增接口方法: 次版本号+1
- 修复bug、文档更新: 修订号+1

**兼容性承诺**:
- 同一主版本内保持向后兼容
- 废弃接口在下一主版本前保留，并标记@deprecated
