import { Controller, Post, Get, Body, Param, Query, ValidationPipe } from '@nestjs/common';
import { VolumeSurgeService } from './volume-surge.service';
import {
  ScanRequestDto,
  CompareScanRequestDto,
  GetResultsQueryDto,
  ExportQueryDto,
} from './dto/scan-request.dto';
import {
  ScanResponseDto,
  ScanStatusResponseDto,
  ScanListResponseDto,
  ScanResultsResponseDto,
  CompareScanResponseDto,
  CancelScanResponseDto,
} from './dto/scan-response.dto';

@Controller('api/volume-surge')
export class VolumeSurgeController {
  constructor(private readonly volumeSurgeService: VolumeSurgeService) {}

  @Post('scan')
  async triggerScan(@Body(ValidationPipe) request: ScanRequestDto): Promise<ScanResponseDto> {
    try {
      const result = await this.volumeSurgeService.scan(request);
      return {
        success: true,
        data: {
          scanId: result.scanId,
          status: result.status,
          message: 'Scan started successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SCAN_FAILED',
          message: error.message,
        },
      };
    }
  }

  @Get('scans/:scanId')
  async getScanStatus(@Param('scanId') scanId: string): Promise<ScanStatusResponseDto> {
    try {
      const scan = await this.volumeSurgeService.getScanStatus(scanId);
      if (!scan) {
        return {
          success: false,
          error: {
            code: 'SCAN_NOT_FOUND',
            message: `Scan with id '${scanId}' not found`,
          },
        };
      }
      return { success: true, data: scan };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  @Get('scans')
  async getScans(@Query() query: any): Promise<ScanListResponseDto> {
    try {
      const options = {
        page: parseInt(query.page || '1') || 1,
        limit: parseInt(query.limit || '10') || 10,
        status: query.status,
        mode: query.mode,
      };
      const result = await this.volumeSurgeService.getScans(options);
      return { success: true, data: result as any };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  @Get('scans/:scanId/results')
  async getScanResults(
    @Param('scanId') scanId: string,
    @Query(ValidationPipe) query: GetResultsQueryDto,
  ): Promise<ScanResultsResponseDto> {
    try {
      const options = {
        filter: query.filter || 'all',
        sortBy: query.sortBy || 'volumeSupportRatio',
        sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
        page: parseInt(query.page || '1') || 1,
        limit: parseInt(query.limit || '20') || 20,
      };
      const result = await this.volumeSurgeService.getScanResults(scanId, options);
      return { success: true, data: result as any };
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        return {
          success: false,
          error: {
            code: 'SCAN_NOT_FOUND',
            message: error.message,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  @Get('scans/:scanId/export')
  async exportResults(
    @Param('scanId') scanId: string,
    @Query(ValidationPipe) query: ExportQueryDto,
  ) {
    try {
      const content = await this.volumeSurgeService.exportResults(
        scanId,
        query.format,
        query.filter || 'matched',
      );

      const filename = `volume-surge-scan-${new Date().toISOString().split('T')[0]}.${query.format === 'csv' ? 'csv' : 'md'}`;
      const contentType = query.format === 'csv' ? 'text/csv' : 'text/markdown';

      return {
        success: true,
        data: {
          content,
          filename,
          contentType,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.message.includes('不存在') ? 'SCAN_NOT_FOUND' : 'EXPORT_FAILED',
          message: error.message,
        },
      };
    }
  }

  @Post('compare')
  async compareScans(
    @Body(ValidationPipe) request: CompareScanRequestDto,
  ): Promise<CompareScanResponseDto> {
    try {
      const result = await this.volumeSurgeService.compareScans(request.scanId1, request.scanId2);
      return { success: true, data: result };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.message.includes('不存在') ? 'SCAN_NOT_FOUND' : 'COMPARE_FAILED',
          message: error.message,
        },
      };
    }
  }

  @Post('scans/:scanId/cancel')
  async cancelScan(@Param('scanId') scanId: string): Promise<CancelScanResponseDto> {
    try {
      const result = await this.volumeSurgeService.cancelScan(scanId);
      return {
        success: true,
        data: {
          scanId: result.scanId,
          status: result.status,
          message: 'Scan cancelled successfully',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.message.includes('不存在') ? 'SCAN_NOT_FOUND' : 'INVALID_STATE',
          message: error.message,
        },
      };
    }
  }
}
