import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetFavoritesDto {
  @ApiPropertyOptional({
    description: '筛选分组（为空则返回全部）',
    example: '核心持仓',
  })
  @IsString()
  @IsOptional()
  group_name?: string;
}
