// backend/src/modules/screener/dto/execute-filter.dto.ts
// T149 [P] [US2] Create execute-filter.dto.ts with FilterCondition[] validation

import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FilterConditionDto {
  @ApiProperty({
    description: 'Type of filter condition',
    enum: [
      'indicator_value',
      'pattern',
      'price_change',
      'volume_change',
      'week_52_high',
      'week_52_low',
      'near_52_high',
      'near_52_low',
      'price_vs_ma',
      'ma_vs_ma',
    ],
    example: 'indicator_value',
  })
  @IsString()
  @IsEnum([
    'indicator_value',
    'pattern',
    'price_change',
    'volume_change',
    'week_52_high',
    'week_52_low',
    'near_52_high',
    'near_52_low',
    'price_vs_ma',
    'ma_vs_ma',
  ])
  conditionType!: string;

  @ApiPropertyOptional({
    description: 'Indicator name (required for indicator_value and price_vs_ma type)',
    enum: ['ma50', 'ma150', 'ma200', 'kdj_k', 'kdj_d', 'kdj_j', 'rsi', 'volume', 'amount'],
    example: 'rsi',
  })
  @IsOptional()
  @IsString()
  indicatorName?: string;

  @ApiPropertyOptional({
    description: 'Comparison operator',
    enum: ['>', '<', '>=', '<=', '='],
    example: '<',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['>', '<', '>=', '<=', '='])
  operator?: string;

  @ApiPropertyOptional({
    description: 'Target value to compare against',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({
    description: 'Pattern name (required for pattern type)',
    enum: ['kdj_golden_cross', 'kdj_death_cross', 'price_above_ma', 'price_below_ma'],
    example: 'kdj_golden_cross',
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({
    description: 'First MA period (for ma_vs_ma type)',
    enum: ['ma_50', 'ma_150', 'ma_200', 'ma_10', 'ma_30', 'ma_40'],
    example: 'ma_50',
  })
  @IsOptional()
  @IsString()
  ma1Period?: string;

  @ApiPropertyOptional({
    description: 'Second MA period (for ma_vs_ma type)',
    enum: ['ma_50', 'ma_150', 'ma_200', 'ma_10', 'ma_30', 'ma_40'],
    example: 'ma_150',
  })
  @IsOptional()
  @IsString()
  ma2Period?: string;
}

export class ExecuteFilterDto {
  @ApiProperty({
    description: 'Array of filter conditions (AND logic)',
    type: [FilterConditionDto],
    example: [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
      },
      {
        conditionType: 'indicator_value',
        indicatorName: 'volume',
        operator: '>',
        targetValue: 1000000,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  conditions!: FilterConditionDto[];

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['stockCode', 'priceChangePercent', 'amount', 'marketCap'],
    example: 'stockCode',
    default: 'stockCode',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class FilterResultDto {
  @ApiProperty({
    description: 'Array of matched stocks (max 100)',
  })
  stocks!: Array<{
    stockCode: string;
    stockName: string;
    market: string;
    latestPrice?: number;
    priceChange?: number;
    priceChangePercent?: number;
    volume?: number;
    amount?: number;
    marketCap?: number;
  }>;

  @ApiProperty({
    description: 'Whether results were truncated to 100',
    example: false,
  })
  isTruncated!: boolean;

  @ApiProperty({
    description: 'Total number of matching stocks (before truncation)',
    example: 50,
  })
  totalCount!: number;
}
