import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for generating VCP analysis request
 * 
 * @example
 * GET /api/vcp/:stockCode/analysis?forceRefresh=true
 */
export class GenerateVcpAnalysisDto {
  @ApiProperty({
    description: '是否强制实时重新计算（忽略缓存）',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  forceRefresh?: boolean;
}
