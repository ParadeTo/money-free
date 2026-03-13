import { ApiProperty } from '@nestjs/swagger';

/**
 * 收缩阶段 DTO
 */
export class ContractionDto {
  @ApiProperty({ description: '收缩序号', example: 1 })
  index!: number;

  @ApiProperty({ description: '高点日期', example: '2025-12-01' })
  swingHighDate!: string;

  @ApiProperty({ description: '高点价格', example: 48.50 })
  swingHighPrice!: number;

  @ApiProperty({ description: '低点日期', example: '2025-12-15' })
  swingLowDate!: string;

  @ApiProperty({ description: '低点价格', example: 31.53 })
  swingLowPrice!: number;

  @ApiProperty({ description: '收缩幅度百分比', example: 35.00 })
  depthPct!: number;

  @ApiProperty({ description: '持续天数', example: 15 })
  durationDays!: number;

  @ApiProperty({ description: '平均成交量', example: 1250000 })
  avgVolume!: number;
}

/**
 * 回调阶段 DTO
 */
export class PullbackDto {
  @ApiProperty({ description: '回调序号', example: 1 })
  index!: number;

  @ApiProperty({ description: '高点日期', example: '2026-01-15' })
  highDate!: string;

  @ApiProperty({ description: '高点价格', example: 47.80 })
  highPrice!: number;

  @ApiProperty({ description: '低点日期', example: '2026-01-20' })
  lowDate!: string;

  @ApiProperty({ description: '低点价格', example: 44.06 })
  lowPrice!: number;

  @ApiProperty({ description: '回调幅度百分比', example: 7.82 })
  pullbackPct!: number;

  @ApiProperty({ description: '持续天数', example: 5 })
  durationDays!: number;

  @ApiProperty({ description: '平均成交量', example: 850000 })
  avgVolume!: number;

  @ApiProperty({ description: '是否在上升趋势中', example: true })
  isInUptrend!: boolean;

  @ApiProperty({ description: '距回调低点的天数', example: 19 })
  daysSinceLow!: number;
}

/**
 * K线数据 DTO
 */
export class KLineDto {
  @ApiProperty({ description: '日期', example: '2026-03-11' })
  date!: string;

  @ApiProperty({ description: '开盘价', example: 44.50 })
  open!: number;

  @ApiProperty({ description: '最高价', example: 45.20 })
  high!: number;

  @ApiProperty({ description: '最低价', example: 44.10 })
  low!: number;

  @ApiProperty({ description: '收盘价', example: 44.85 })
  close!: number;

  @ApiProperty({ description: '成交量', example: 680000 })
  volume!: number;

  @ApiProperty({ description: '涨跌幅百分比', example: 0.78 })
  changePct!: number;
}

/**
 * 趋势模板检查项 DTO
 */
export class TrendTemplateCheckDto {
  @ApiProperty({ description: '检查项名称', example: '股价高于200日均线' })
  name!: string;

  @ApiProperty({ description: '是否通过', example: true })
  pass!: boolean;

  @ApiProperty({ description: '检查项说明', required: false, example: '当前价格 45.67 > MA200 38.20' })
  description?: string;
}

/**
 * VCP形态摘要 DTO
 */
export class VcpSummaryDto {
  @ApiProperty({ description: '收缩次数', example: 3 })
  contractionCount!: number;

  @ApiProperty({ description: '最后收缩幅度百分比', example: 12.40 })
  lastContractionPct!: number;

  @ApiProperty({ description: '成交量是否萎缩', example: true })
  volumeDryingUp!: boolean;

  @ApiProperty({ description: 'RS评分 (0-100)', example: 85 })
  rsRating!: number;

  @ApiProperty({ description: '当前是否处于回调', example: false })
  inPullback!: boolean;

  @ApiProperty({ description: '回调次数', example: 2 })
  pullbackCount!: number;

  @ApiProperty({ description: '最新价格', example: 45.67 })
  latestPrice!: number;

  @ApiProperty({ description: '涨跌幅百分比', example: 2.15 })
  priceChangePct!: number;

  @ApiProperty({ description: '距52周高点百分比', example: -5.23 })
  distFrom52WeekHigh!: number;

  @ApiProperty({ description: '距52周低点百分比', example: 68.45 })
  distFrom52WeekLow!: number;
}

/**
 * VCP分析完整响应 DTO
 */
export class VcpAnalysisResponseDto {
  @ApiProperty({ description: '股票代码', example: '605117' })
  stockCode!: string;

  @ApiProperty({ description: '股票名称', example: '德业股份' })
  stockName!: string;

  @ApiProperty({ description: '市场', example: 'SH', enum: ['SH', 'SZ', 'HK', 'US'] })
  market!: string;

  @ApiProperty({ description: '货币', example: 'CNY', enum: ['CNY', 'HKD', 'USD'] })
  currency!: string;

  @ApiProperty({ description: '扫描日期', example: '2026-03-11' })
  scanDate!: string;

  @ApiProperty({ description: '是否来自缓存', example: false })
  cached!: boolean;

  @ApiProperty({ description: '是否过期 (>7天)', example: false })
  isExpired!: boolean;

  @ApiProperty({ description: '是否有有效的VCP形态', example: true })
  hasVcp!: boolean;

  @ApiProperty({ description: 'VCP形态摘要', type: VcpSummaryDto })
  summary!: VcpSummaryDto;

  @ApiProperty({ description: '收缩阶段列表', type: [ContractionDto] })
  contractions!: ContractionDto[];

  @ApiProperty({ description: '回调阶段列表', type: [PullbackDto] })
  pullbacks!: PullbackDto[];

  @ApiProperty({ description: '最近的K线数据 (默认10天)', type: [KLineDto] })
  klines!: KLineDto[];

  @ApiProperty({
    description: '趋势模板检查结果',
    example: {
      pass: true,
      checks: [
        { name: '股价高于200日均线', pass: true, description: '当前价格 45.67 > MA200 38.20' },
      ],
    },
  })
  trendTemplate!: {
    pass: boolean;
    checks: TrendTemplateCheckDto[];
  };
}
