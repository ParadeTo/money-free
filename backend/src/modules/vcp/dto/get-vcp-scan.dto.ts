import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
}
