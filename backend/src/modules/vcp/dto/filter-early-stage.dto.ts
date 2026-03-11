import { IsNumber, Min, Max, IsInt, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterEarlyStageRequestDto {
  @ApiProperty({
    description: '距52周低点阈值（%）',
    minimum: 20,
    maximum: 60,
    example: 40,
  })
  @IsNumber()
  @Min(20, { message: 'distFrom52WeekLow必须在20-60之间' })
  @Max(60, { message: 'distFrom52WeekLow必须在20-60之间' })
  distFrom52WeekLow!: number;

  @ApiProperty({
    description: '距52周高点阈值（%）',
    minimum: 10,
    maximum: 50,
    example: 30,
  })
  @IsNumber()
  @Min(10, { message: 'distFrom52WeekHigh必须在10-50之间' })
  @Max(50, { message: 'distFrom52WeekHigh必须在10-50之间' })
  distFrom52WeekHigh!: number;

  @ApiProperty({
    description: '最小收缩次数',
    minimum: 2,
    maximum: 8,
    example: 3,
  })
  @IsInt({ message: 'contractionCountMin必须是整数' })
  @Min(2, { message: 'contractionCountMin必须在2-8之间' })
  @Max(8, { message: 'contractionCountMin必须在2-8之间' })
  contractionCountMin!: number;

  @ApiProperty({
    description: '最大收缩次数',
    minimum: 2,
    maximum: 8,
    example: 4,
  })
  @IsInt({ message: 'contractionCountMax必须是整数' })
  @Min(2, { message: 'contractionCountMax必须在2-8之间' })
  @Max(8, { message: 'contractionCountMax必须在2-8之间' })
  contractionCountMax!: number;
}

export class PullbackInfoDto {
  @ApiProperty({ description: '回调持续天数' })
  durationDays!: number;

  @ApiProperty({ description: '回调幅度%' })
  pullbackPct!: number;

  @ApiProperty({ description: '回调前高点价格' })
  highPrice!: number;

  @ApiProperty({ description: '回调低点价格' })
  lowPrice!: number;

  @ApiProperty({ description: '回调前高点日期' })
  highDate!: string;

  @ApiProperty({ description: '回调低点日期' })
  lowDate!: string;

  @ApiProperty({ description: '距离回调低点天数' })
  daysSinceLow!: number;

  @ApiProperty({ description: '从低点反弹%' })
  recoveryPct!: number;
}

export class EarlyStageStockDto {
  @ApiProperty({ description: '股票代码', example: '002142' })
  stockCode!: string;

  @ApiProperty({ description: '股票名称', example: '宁波银行' })
  stockName!: string;

  @ApiProperty({ description: '最新价格', example: 31.56 })
  latestPrice!: number;

  @ApiProperty({ description: '涨跌幅%', example: 0.45 })
  priceChangePct!: number;

  @ApiProperty({ description: '距52周高点%', example: 4.13 })
  distFrom52WeekHigh!: number;

  @ApiProperty({ description: '距52周低点%', example: 44.44 })
  distFrom52WeekLow!: number;

  @ApiProperty({ description: '收缩次数', example: 3 })
  contractionCount!: number;

  @ApiProperty({ description: '最后收缩幅度%', example: 6.53 })
  lastContractionPct!: number;

  @ApiProperty({ description: 'RS评分（0-100）', example: 74 })
  rsRating!: number;

  @ApiProperty({ description: '成交量是否萎缩', example: false })
  volumeDryingUp!: boolean;

  @ApiProperty({ 
    description: 'VCP阶段', 
    enum: ['contraction', 'in_pullback', 'pullback_ended'],
    example: 'in_pullback',
  })
  vcpStage!: string;

  @ApiPropertyOptional({ description: '回调信息', type: PullbackInfoDto })
  pullbackInfo?: PullbackInfoDto;
}

export class QuickActionDto {
  @ApiProperty({ description: '操作标签', example: '放宽5%' })
  label!: string;

  @ApiProperty({ description: '调整后的条件' })
  adjustments!: Partial<FilterEarlyStageRequestDto>;
}

export class ResultTipDto {
  @ApiProperty({ description: '提示类型', enum: ['warning', 'info', 'error'] })
  type!: 'warning' | 'info' | 'error';

  @ApiProperty({ description: '提示消息' })
  message!: string;

  @ApiProperty({ description: '建议的快捷操作', type: [QuickActionDto] })
  suggestedActions!: QuickActionDto[];
}

export class FilterEarlyStageResponseDto {
  @ApiProperty({ description: '筛选出的股票列表', type: [EarlyStageStockDto] })
  stocks!: EarlyStageStockDto[];

  @ApiProperty({ description: '总数量', example: 7 })
  total!: number;

  @ApiProperty({ description: '实际应用的筛选条件', type: FilterEarlyStageRequestDto })
  appliedConditions!: FilterEarlyStageRequestDto;

  @ApiPropertyOptional({ description: '智能提示', type: ResultTipDto })
  tip?: ResultTipDto;
}
