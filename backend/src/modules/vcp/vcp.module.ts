import { Module } from '@nestjs/common';
import { VcpController } from './vcp.controller';
import { VcpService } from './vcp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TrendTemplateService } from '../../services/vcp/trend-template.service';
import { RsRatingService } from '../../services/vcp/rs-rating.service';
import { VcpAnalyzerService } from '../../services/vcp/vcp-analyzer.service';
import { VcpScannerService } from '../../services/vcp/vcp-scanner.service';
import { VcpEarlyFilterService } from '../../services/vcp/vcp-early-filter.service';
import { VcpFormatterService } from '../../services/vcp/vcp-formatter.service';

@Module({
  imports: [PrismaModule],
  controllers: [VcpController],
  providers: [
    VcpService,
    TrendTemplateService,
    RsRatingService,
    VcpAnalyzerService,
    VcpScannerService,
    VcpEarlyFilterService,
    VcpFormatterService,
  ],
  exports: [VcpService, VcpScannerService, VcpFormatterService],
})
export class VcpModule {}
