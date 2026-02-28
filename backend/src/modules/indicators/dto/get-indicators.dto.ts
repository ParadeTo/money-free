import { IsOptional, IsIn, IsArray, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetIndicatorsDto {
  @ApiPropertyOptional({ 
    description: 'K线周期', 
    enum: ['daily', 'weekly'], 
    default: 'daily',
  })
  @IsOptional()
  @IsIn(['daily', 'weekly'])
  period?: 'daily' | 'weekly' = 'daily';

  @ApiPropertyOptional({ 
    description: '指标类型数组', 
    isArray: true,
    enum: ['ma', 'kdj', 'rsi', 'volume', 'amount', 'week52_marker'],
    example: ['ma', 'kdj', 'volume'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsIn(['ma', 'kdj', 'rsi', 'volume', 'amount', 'week52_marker'], { each: true })
  indicators?: string[];

  @ApiPropertyOptional({ 
    description: '开始日期（YYYY-MM-DD）', 
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: '结束日期（YYYY-MM-DD）', 
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
