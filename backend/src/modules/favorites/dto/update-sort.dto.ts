import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSortDto {
  @ApiProperty({
    description: '排序顺序',
    example: 5,
  })
  @IsInt()
  @Min(0)
  sort_order!: number;
}
