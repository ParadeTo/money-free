import { IsOptional, IsIn, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetKLinesDto {
  @ApiPropertyOptional({ 
    description: 'K线周期', 
    enum: ['daily', 'weekly'], 
    default: 'daily',
    example: 'daily',
  })
  @IsOptional()
  @IsIn(['daily', 'weekly'])
  period?: 'daily' | 'weekly' = 'daily';

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

  @ApiPropertyOptional({ 
    description: '数据条数限制', 
    minimum: 1, 
    maximum: 10000,
    default: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 500;
}
