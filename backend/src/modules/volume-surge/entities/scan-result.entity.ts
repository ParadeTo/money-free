import { ScanResult as PrismaScanResult } from '@prisma/client';

export class ScanResultEntity implements PrismaScanResult {
  id!: string;
  scanId!: string;
  stockCode!: string;

  contractionStartDate!: Date;
  contractionEndDate!: Date;
  contractionAvgVolume!: number;
  expansionStartDate!: Date;
  expansionDays!: number;
  expansionMultiplier!: number;

  upDayAvgVolume!: number;
  downDayAvgVolume!: number;
  volumeSupportRatio!: number;

  ma50Value!: number;
  ma150Value!: number;
  ma50Slope!: number;
  ma50TrendingUp!: boolean;
  ma50BelowMa150!: boolean;

  meetsVolumeCriteria!: boolean;
  meetsMaCriteria!: boolean;
  meetsSupportCriteria!: boolean;
  meetsAllCriteria!: boolean;

  createdAt!: Date;
}
