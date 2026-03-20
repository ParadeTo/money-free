import { IsEnum, IsOptional, IsString, IsDateString, ValidateIf } from 'class-validator';
import { ScanMode } from '../../../types/scan.types';

export class ScanRequestDto {
  @IsEnum(ScanMode)
  mode!: ScanMode;

  @ValidateIf((o) => o.mode === ScanMode.MANUAL)
  @IsDateString()
  referenceDate?: string;

  @IsOptional()
  @IsString()
  source?: 'web' | 'cli';
}

export class CompareScanRequestDto {
  @IsString()
  scanId1!: string;

  @IsString()
  scanId2!: string;
}

export class GetResultsQueryDto {
  @IsOptional()
  @IsString()
  filter?: 'all' | 'matched' | 'unmatched';

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class ExportQueryDto {
  @IsEnum(['csv', 'markdown'])
  format!: 'csv' | 'markdown';

  @IsOptional()
  @IsString()
  filter?: 'all' | 'matched';
}
