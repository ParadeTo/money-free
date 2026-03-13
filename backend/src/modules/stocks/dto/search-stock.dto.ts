import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchStockDto {
  @ApiPropertyOptional({ description: '搜索关键词（股票代码或名称）', example: '600519' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '市场', enum: ['SH', 'SZ', 'HK', 'US'], example: 'SH' })
  @IsOptional()
  @IsIn(['SH', 'SZ', 'HK', 'US'])
  market?: 'SH' | 'SZ' | 'HK' | 'US';

  @ApiPropertyOptional({ description: '准入状态', enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  admissionStatus?: 'active' | 'inactive';

  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
