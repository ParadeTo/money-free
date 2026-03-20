import { Module } from '@nestjs/common';
import { VolumeSurgeController } from './volume-surge.controller';
import { VolumeSurgeService } from './volume-surge.service';
import { PatternDetectorService } from './services/pattern-detector.service';
import { MovingAverageService } from './services/moving-average.service';
import { ScanExecutorService } from './services/scan-executor.service';
import { VolumeSupportCalculatorService } from './services/volume-support-calculator.service';
import { ExportService } from './services/export.service';
import { ComparisonService } from './services/comparison.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VolumeSurgeController],
  providers: [
    VolumeSurgeService,
    PatternDetectorService,
    MovingAverageService,
    ScanExecutorService,
    VolumeSupportCalculatorService,
    ExportService,
    ComparisonService,
  ],
  exports: [VolumeSurgeService],
})
export class VolumeSurgeModule {}
