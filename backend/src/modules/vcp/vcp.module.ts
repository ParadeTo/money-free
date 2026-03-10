import { Module } from '@nestjs/common';
import { VcpController } from './vcp.controller';
import { VcpService } from './vcp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TrendTemplateService } from '../../services/vcp/trend-template.service';
import { RsRatingService } from '../../services/vcp/rs-rating.service';
import { VcpAnalyzerService } from '../../services/vcp/vcp-analyzer.service';
import { VcpScannerService } from '../../services/vcp/vcp-scanner.service';

@Module({
  imports: [PrismaModule],
  controllers: [VcpController],
  providers: [
    VcpService,
    TrendTemplateService,
    RsRatingService,
    VcpAnalyzerService,
    VcpScannerService,
  ],
  exports: [VcpService, VcpScannerService],
})
export class VcpModule {}
