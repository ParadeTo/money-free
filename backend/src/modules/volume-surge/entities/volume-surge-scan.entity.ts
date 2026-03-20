import { VolumeSurgeScan as PrismaVolumeSurgeScan } from '@prisma/client';

export class VolumeSurgeScanEntity implements PrismaVolumeSurgeScan {
  id!: string;
  scanDate!: Date;
  scanMode!: string;
  referenceDate!: Date | null;
  status!: string;
  totalStocks!: number;
  matchedStocks!: number;
  durationMs!: number | null;
  errorMessage!: string | null;
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
