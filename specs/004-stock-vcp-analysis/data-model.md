# Data Model: 单股票VCP分析查询

**Feature**: 004-stock-vcp-analysis  
**Date**: 2026-03-11  
**Status**: Phase 1 Design

## Overview

本功能复用现有的数据库模型（`Stock`, `VcpScanResult`, `KLineData`），不需要创建新的数据库表。数据模型主要定义前后端交互的 TypeScript 接口和 DTO（Data Transfer Object）。

---

## 1. 数据库模型（已存在，复用）

### 1.1 Stock（股票基础信息）

已存在于数据库，无需修改。

```prisma
model Stock {
  id           Int      @id @default(autoincrement())
  stockCode    String   @unique
  stockName    String
  listDate     DateTime?
  delistDate   DateTime?
  // ... 其他字段
}
```

**用途**: 提供股票代码和名称信息

---

### 1.2 VcpScanResult（VCP扫描结果）

已存在于数据库，无需修改。

```prisma
model VcpScanResult {
  id                   Int      @id @default(autoincrement())
  stockCode            String
  scanDate             DateTime
  trendTemplatePass    Boolean
  contractionCount     Int
  lastContractionPct   Float
  volumeDryingUp       Boolean
  rsRating             Int
  inPullback           Boolean
  pullbackCount        Int
  lastPullbackData     String?  // JSON 字符串
  // ... 其他字段
  
  @@unique([stockCode, scanDate])
}
```

**用途**: 提供缓存的VCP分析结果

---

### 1.3 KLineData（K线数据）

已存在于数据库，无需修改。

```prisma
model KLineData {
  id         Int      @id @default(autoincrement())
  stockCode  String
  period     String   // 'daily', 'weekly'
  date       DateTime
  open       Float
  high       Float
  low        Float
  close      Float
  volume     Int
  // ... 其他字段
  
  @@unique([stockCode, period, date])
}
```

**用途**: 提供K线数据用于实时VCP分析计算

---

## 2. 后端 DTO（Data Transfer Objects）

### 2.1 GenerateVcpAnalysisDto（请求）

```typescript
// backend/src/modules/vcp/dto/generate-vcp-analysis.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateVcpAnalysisDto {
  @ApiProperty({
    description: '是否强制实时重新计算（忽略缓存）',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}
```

**验证规则**:
- `forceRefresh`: 可选，必须是布尔值

---

### 2.2 VcpAnalysisResponseDto（响应）

```typescript
// backend/src/modules/vcp/dto/vcp-analysis-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ContractionDto {
  @ApiProperty({ description: '收缩序号' })
  index: number;

  @ApiProperty({ description: '高点日期', example: '2025-12-01' })
  swingHighDate: string;

  @ApiProperty({ description: '高点价格' })
  swingHighPrice: number;

  @ApiProperty({ description: '低点日期', example: '2025-12-15' })
  swingLowDate: string;

  @ApiProperty({ description: '低点价格' })
  swingLowPrice: number;

  @ApiProperty({ description: '收缩幅度百分比' })
  depthPct: number;

  @ApiProperty({ description: '持续天数' })
  durationDays: number;

  @ApiProperty({ description: '平均成交量' })
  avgVolume: number;
}

export class PullbackDto {
  @ApiProperty({ description: '回调序号' })
  index: number;

  @ApiProperty({ description: '高点日期', example: '2026-01-15' })
  highDate: string;

  @ApiProperty({ description: '高点价格' })
  highPrice: number;

  @ApiProperty({ description: '低点日期', example: '2026-01-20' })
  lowDate: string;

  @ApiProperty({ description: '低点价格' })
  lowPrice: number;

  @ApiProperty({ description: '回调幅度百分比' })
  pullbackPct: number;

  @ApiProperty({ description: '持续天数' })
  durationDays: number;

  @ApiProperty({ description: '平均成交量' })
  avgVolume: number;

  @ApiProperty({ description: '是否在上升趋势中' })
  isInUptrend: boolean;

  @ApiProperty({ description: '距回调低点的天数' })
  daysSinceLow: number;
}

export class KLineDto {
  @ApiProperty({ description: '日期', example: '2026-03-11' })
  date: string;

  @ApiProperty({ description: '开盘价' })
  open: number;

  @ApiProperty({ description: '最高价' })
  high: number;

  @ApiProperty({ description: '最低价' })
  low: number;

  @ApiProperty({ description: '收盘价' })
  close: number;

  @ApiProperty({ description: '成交量' })
  volume: number;

  @ApiProperty({ description: '涨跌幅百分比' })
  changePct: number;
}

export class TrendTemplateCheckDto {
  @ApiProperty({ description: '检查项名称', example: '股价高于200日均线' })
  name: string;

  @ApiProperty({ description: '是否通过' })
  pass: boolean;

  @ApiProperty({ description: '检查项说明', required: false })
  description?: string;
}

export class VcpSummaryDto {
  @ApiProperty({ description: '收缩次数' })
  contractionCount: number;

  @ApiProperty({ description: '最后收缩幅度百分比' })
  lastContractionPct: number;

  @ApiProperty({ description: '成交量是否萎缩' })
  volumeDryingUp: boolean;

  @ApiProperty({ description: 'RS评分 (0-100)' })
  rsRating: number;

  @ApiProperty({ description: '当前是否处于回调' })
  inPullback: boolean;

  @ApiProperty({ description: '回调次数' })
  pullbackCount: number;

  @ApiProperty({ description: '最新价格' })
  latestPrice: number;

  @ApiProperty({ description: '涨跌幅百分比' })
  priceChangePct: number;

  @ApiProperty({ description: '距52周高点百分比' })
  distFrom52WeekHigh: number;

  @ApiProperty({ description: '距52周低点百分比' })
  distFrom52WeekLow: number;
}

export class VcpAnalysisResponseDto {
  @ApiProperty({ description: '股票代码', example: '605117' })
  stockCode: string;

  @ApiProperty({ description: '股票名称', example: '德业股份' })
  stockName: string;

  @ApiProperty({ description: '扫描日期', example: '2026-03-11' })
  scanDate: string;

  @ApiProperty({ description: '是否来自缓存' })
  cached: boolean;

  @ApiProperty({ description: '是否过期 (>7天)' })
  isExpired: boolean;

  @ApiProperty({ description: '是否有有效的VCP形态' })
  hasVcp: boolean;

  @ApiProperty({ description: 'VCP 形态摘要', type: VcpSummaryDto })
  summary: VcpSummaryDto;

  @ApiProperty({ description: '收缩阶段列表', type: [ContractionDto] })
  contractions: ContractionDto[];

  @ApiProperty({ description: '回调阶段列表', type: [PullbackDto] })
  pullbacks: PullbackDto[];

  @ApiProperty({ description: '最近的K线数据 (默认10天)', type: [KLineDto] })
  klines: KLineDto[];

  @ApiProperty({ description: '趋势模板检查结果' })
  trendTemplate: {
    pass: boolean;
    checks: TrendTemplateCheckDto[];
  };
}
```

**字段说明**:
- `cached`: 标识数据来源（缓存 vs 实时计算）
- `isExpired`: 用于前端显示过期警告
- `daysSinceLow`: 回调低点距今天数，用于判断回调状态
- `changePct`: K线数据的涨跌幅，前端需要根据正负显示不同颜色

---

## 3. 前端类型定义

### 3.1 VcpAnalysis（前端使用）

```typescript
// frontend/src/types/vcp.ts (扩展现有文件)

export interface Contraction {
  index: number;
  swingHighDate: string;
  swingHighPrice: number;
  swingLowDate: string;
  swingLowPrice: number;
  depthPct: number;
  durationDays: number;
  avgVolume: number;
}

export interface Pullback {
  index: number;
  highDate: string;
  highPrice: number;
  lowDate: string;
  lowPrice: number;
  pullbackPct: number;
  durationDays: number;
  avgVolume: number;
  isInUptrend: boolean;
  daysSinceLow: number;
}

export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number;
}

export interface TrendTemplateCheck {
  name: string;
  pass: boolean;
  description?: string;
}

export interface VcpSummary {
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
  rsRating: number;
  inPullback: boolean;
  pullbackCount: number;
  latestPrice: number;
  priceChangePct: number;
  distFrom52WeekHigh: number;
  distFrom52WeekLow: number;
}

export interface VcpAnalysis {
  stockCode: string;
  stockName: string;
  scanDate: string;
  cached: boolean;
  isExpired: boolean;
  hasVcp: boolean;
  summary: VcpSummary;
  contractions: Contraction[];
  pullbacks: Pullback[];
  klines: KLineData[];
  trendTemplate: {
    pass: boolean;
    checks: TrendTemplateCheck[];
  };
}
```

**类型映射**:
后端 DTO → 前端 Type 直接映射，字段名和类型完全一致

---

## 4. 服务层数据转换

### 4.1 VcpService.generateAnalysis()

```typescript
// backend/src/modules/vcp/vcp.service.ts
async generateAnalysis(
  stockCode: string, 
  forceRefresh = false
): Promise<VcpAnalysisResponseDto> {
  
  // 1. 获取股票信息
  const stock = await this.prisma.stock.findUnique({ 
    where: { stockCode } 
  });
  if (!stock) {
    throw new NotFoundException(`Stock ${stockCode} not found`);
  }

  // 2. 检查缓存
  let cached = false;
  let scanDate: Date;
  let analysisResult: VcpAnalysisResult;
  
  if (!forceRefresh) {
    const cachedResult = await this.prisma.vcpScanResult.findFirst({
      where: { stockCode },
      orderBy: { scanDate: 'desc' },
    });
    
    if (cachedResult) {
      cached = true;
      scanDate = cachedResult.scanDate;
      // 从缓存构建分析结果
      analysisResult = this.buildFromCache(cachedResult);
    }
  }
  
  // 3. 如果没有缓存或强制刷新，执行实时分析
  if (!cached || forceRefresh) {
    const klines = await this.loadKLines(stockCode);
    if (klines.length < 30) {
      throw new BadRequestException('Insufficient K-line data (< 30 days)');
    }
    
    analysisResult = await this.vcpAnalyzer.analyze(klines);
    scanDate = new Date();
    
    // 保存到数据库
    await this.saveToCache(stockCode, scanDate, analysisResult);
  }
  
  // 4. 检查是否过期
  const daysSinceScan = Math.floor(
    (Date.now() - scanDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysSinceScan > 7;
  
  // 5. 转换为响应DTO
  return this.mapToResponseDto(
    stock, 
    scanDate, 
    cached, 
    isExpired, 
    analysisResult
  );
}
```

**数据流**:
```
Database (Stock, VcpScanResult, KLineData)
  ↓ 查询
VcpService.generateAnalysis()
  ↓ 分析/转换
VcpAnalysisResponseDto
  ↓ HTTP响应
Frontend (VcpAnalysis)
  ↓ 渲染
UI 组件
```

---

## 5. 字段验证规则

### 5.1 后端验证

| 字段 | 验证规则 | 错误消息 |
|------|---------|---------|
| stockCode | 必须存在于 Stock 表 | "Stock {code} not found" |
| K线数据 | 至少30天数据 | "Insufficient K-line data (< 30 days)" |
| forceRefresh | 布尔值 | "forceRefresh must be a boolean" |

### 5.2 前端验证

| 字段 | 验证规则 | 错误提示 |
|------|---------|---------|
| stockCode (路由参数) | 非空，长度6位 | "无效的股票代码" |
| API响应 | 必须包含所有必需字段 | "数据格式错误，请刷新重试" |

---

## 6. 数据关系图

```
┌─────────────┐
│   Stock     │
│  stockCode  │◄──────┐
│  stockName  │       │
└─────────────┘       │
                      │ 1:N
                      │
           ┌──────────┴───────────┐
           │   VcpScanResult      │
           │   stockCode (FK)     │
           │   scanDate           │
           │   contractionCount   │
           │   lastPullbackData   │
           │   ...                │
           └──────────────────────┘
                      │
                      │ 用于缓存
                      ↓
           ┌──────────────────────┐
           │  VcpAnalyzer.analyze()│
           │  (实时计算)            │
           └──────────────────────┘
                      ↑
                      │ 输入
                      │
           ┌──────────┴───────────┐
           │   KLineData          │
           │   stockCode (FK)     │
           │   date, OHLCV        │
           └──────────────────────┘
```

---

## 7. 性能考虑

### 7.1 数据量估算

| 数据类型 | 单股票数据量 | 响应大小估算 |
|---------|-------------|------------|
| 股票基础信息 | 1条 | ~100 bytes |
| VCP摘要 | 1条 | ~200 bytes |
| 收缩阶段 | 平均3-5条 | ~500 bytes |
| 回调阶段 | 平均2-4条 | ~400 bytes |
| K线数据 | 10条（默认） | ~1 KB |
| 趋势模板检查 | 5-8条 | ~500 bytes |
| **总计** | - | **~2.7 KB** |

**结论**: 单次请求响应数据量很小（< 3KB），无需分页或延迟加载

### 7.2 缓存策略

- **数据库缓存**: VcpScanResult 表，按 stockCode + scanDate 索引
- **浏览器缓存**: React Query 缓存7天（staleTime: 7 days）
- **失效策略**: 用户手动刷新（forceRefresh=true）时失效

---

## 8. 错误状态建模

```typescript
// frontend/src/types/errors.ts
export enum VcpAnalysisErrorCode {
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface VcpAnalysisError {
  code: VcpAnalysisErrorCode;
  message: string;
  stockCode?: string;
  details?: Record<string, any>;
}
```

**错误映射**:
| HTTP状态码 | 错误代码 | 用户提示 |
|-----------|---------|---------|
| 404 | STOCK_NOT_FOUND | "未找到股票代码 {code}，请检查输入" |
| 400 | INSUFFICIENT_DATA | "该股票暂无足够的K线数据进行VCP分析（需要至少30天数据）" |
| 500 | ANALYSIS_FAILED | "VCP分析失败，请稍后重试" |
| - | NETWORK_ERROR | "服务暂时不可用，请稍后重试" |

---

## Summary

数据模型设计完成，关键点：

1. ✅ **复用现有数据库模型**，无需创建新表
2. ✅ **定义清晰的 DTO 和 TypeScript 接口**，前后端类型一致
3. ✅ **明确数据转换流程**，从数据库到UI的完整链路
4. ✅ **考虑性能和缓存**，响应数据量小（< 3KB），缓存策略合理
5. ✅ **错误状态建模**，覆盖所有边界情况

**Next**: 生成 API 合约文档 (contracts/vcp-analysis-api.md)
