import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inPullbackOnly?: boolean;
}
