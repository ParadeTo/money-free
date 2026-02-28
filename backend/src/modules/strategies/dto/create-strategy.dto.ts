// backend/src/modules/strategies/dto/create-strategy.dto.ts
// T150 [P] [US2] Create create-strategy.dto.ts with strategyName, description, conditions validation

import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConditionDto {
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
  ])
  conditionType!: string;

  @ApiPropertyOptional({
    description: 'Indicator name (for indicator_value type)',
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
    description: 'Target value',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({
    description: 'Pattern name (for pattern type)',
    example: 'kdj_golden_cross',
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({
    description: 'Sort order of this condition',
    example: 0,
    default: 0,
  })
  @IsInt()
  sortOrder!: number;
}

export class CreateStrategyDto {
  @ApiProperty({
    description: 'Strategy name',
    example: '超跌反弹策略',
  })
  @IsString()
  @IsNotEmpty()
  strategyName!: string;

  @ApiPropertyOptional({
    description: 'Strategy description',
    example: 'RSI < 30 且成交量放大',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of filter conditions',
    type: [ConditionDto],
    example: [
      {
        conditionType: 'indicator_value',
        indicatorName: 'rsi',
        operator: '<',
        targetValue: 30,
        sortOrder: 0,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions!: ConditionDto[];
}

export class UpdateStrategyDto {
  @ApiPropertyOptional({
    description: 'Strategy name',
    example: '超跌反弹策略 v2',
  })
  @IsOptional()
  @IsString()
  strategyName?: string;

  @ApiPropertyOptional({
    description: 'Strategy description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of filter conditions',
    type: [ConditionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];
}

export class StrategyResponseDto {
  @ApiProperty({ description: 'Strategy ID' })
  strategyId!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Strategy name' })
  strategyName!: string;

  @ApiPropertyOptional({ description: 'Strategy description' })
  description?: string;

  @ApiProperty({ description: 'Filter conditions' })
  conditions!: ConditionDto[];

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}
