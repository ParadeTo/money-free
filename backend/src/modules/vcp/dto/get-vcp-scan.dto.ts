import { IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class GetVcpScanDto {
  @ApiPropertyOptional({
    enum: ['contractionCount', 'lastContractionPct', 'volumeDryingUp', 'rsRating', 'priceChangePct'],
    default: 'lastContractionPct',
  })
  @IsOptional()
  @IsIn(['contractionCount', 'lastContractionPct', 'volumeDryingUp', 'rsRating', 'priceChangePct'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;

  @ApiPropertyOptional({
    description: '只返回处于回调中的股票',
    type: String,
  })
  @IsOptional()
  @IsIn(['true', 'false', true, false], {
    message: 'inPullbackOnly must be "true" or "false"',
  })
  inPullbackOnly?: string | boolean;

  @ApiPropertyOptional({
    description: '最大回调幅度（百分比），过滤掉回调幅度大于此值的股票',
    type: Number,
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  maxPullbackPct?: number;
}
