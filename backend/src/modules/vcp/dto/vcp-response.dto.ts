import { ApiProperty } from '@nestjs/swagger';

export class VcpScanItemDto {
  @ApiProperty() stockCode!: string;
  @ApiProperty() stockName!: string;
  @ApiProperty() latestPrice!: number;
  @ApiProperty() priceChangePct!: number;
  @ApiProperty() distFrom52WeekHigh!: number;
  @ApiProperty() distFrom52WeekLow!: number;
  @ApiProperty() contractionCount!: number;
  @ApiProperty() lastContractionPct!: number;
  @ApiProperty() volumeDryingUp!: boolean;
  @ApiProperty() rsRating!: number;
}

export class VcpScanResponseDto {
  @ApiProperty({ type: [VcpScanItemDto] }) stocks!: VcpScanItemDto[];
  @ApiProperty() totalCount!: number;
  @ApiProperty() scanDate!: string;
}

export class TrendTemplateCheckDto {
  @ApiProperty() name!: string;
  @ApiProperty() label!: string;
  @ApiProperty() pass!: boolean;
  @ApiProperty() currentValue!: number;
  @ApiProperty() threshold!: number;
}

export class ContractionDto {
  @ApiProperty() index!: number;
  @ApiProperty() swingHighDate!: string;
  @ApiProperty() swingHighPrice!: number;
  @ApiProperty() swingLowDate!: string;
  @ApiProperty() swingLowPrice!: number;
  @ApiProperty() depthPct!: number;
  @ApiProperty() durationDays!: number;
  @ApiProperty() avgVolume!: number;
}

export class VcpDetailResponseDto {
  @ApiProperty() stockCode!: string;
  @ApiProperty() stockName!: string;
  @ApiProperty() scanDate!: string;
  @ApiProperty() trendTemplate!: { allPass: boolean; checks: TrendTemplateCheckDto[] };
  @ApiProperty({ type: [ContractionDto] }) contractions!: ContractionDto[];
  @ApiProperty() contractionCount!: number;
  @ApiProperty() lastContractionPct!: number;
  @ApiProperty() volumeDryingUp!: boolean;
  @ApiProperty() rsRating!: number;
}
