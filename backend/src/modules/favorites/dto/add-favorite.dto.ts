import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddFavoriteDto {
  @ApiProperty({
    description: '股票代码',
    example: '600519',
  })
  @IsString()
  @IsNotEmpty({ message: 'stock_code 不能为空' })
  stock_code!: string;

  @ApiPropertyOptional({
    description: '分组名称',
    example: '核心持仓',
  })
  @IsString()
  @IsOptional()
  group_name?: string;
}
