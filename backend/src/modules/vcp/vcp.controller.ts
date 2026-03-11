import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { VcpService } from './vcp.service';
import { GetVcpScanDto } from './dto/get-vcp-scan.dto';
import { VcpScanResponseDto, VcpDetailResponseDto } from './dto/vcp-response.dto';
import { FilterEarlyStageRequestDto, FilterEarlyStageResponseDto } from './dto/filter-early-stage.dto';

@ApiTags('vcp')
@Controller('vcp')
export class VcpController {
  private readonly logger = new Logger(VcpController.name);

  constructor(private readonly vcpService: VcpService) { }

  @Get('scan')
  @ApiOperation({ summary: '获取 VCP 待突破扫描结果列表' })
  @ApiResponse({ status: 200, description: 'VCP 扫描结果', type: VcpScanResponseDto })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['contractionCount', 'lastContractionPct', 'volumeDryingUp', 'rsRating', 'priceChangePct'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'inPullbackOnly', required: false, type: Boolean, description: '只返回处于回调中的股票' })
  async getScanResults(@Query() dto: GetVcpScanDto) {
    return this.vcpService.getLatestScanResults(dto);
  }

  @Get(':stockCode/detail')
  @ApiOperation({ summary: '获取单只股票的 VCP 形态详情' })
  @ApiResponse({ status: 200, description: 'VCP 详情', type: VcpDetailResponseDto })
  @ApiResponse({ status: 404, description: '未找到 VCP 数据' })
  @ApiParam({ name: 'stockCode', description: '股票代码', example: '600519.SH' })
  async getStockDetail(@Param('stockCode') stockCode: string) {
    return this.vcpService.getStockVcpDetail(stockCode);
  }

  @Post('early-stage')
  @ApiOperation({ summary: '筛选早期启动阶段的VCP股票' })
  @ApiBody({ type: FilterEarlyStageRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: '筛选结果', 
    type: FilterEarlyStageResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: '参数验证失败',
  })
  @ApiResponse({ 
    status: 500, 
    description: '筛选服务暂时不可用',
  })
  async filterEarlyStage(@Body() conditions: FilterEarlyStageRequestDto) {
    this.logger.log({
      action: 'filter_early_stage',
      conditions,
    });

    try {
      const result = await this.vcpService.filterEarlyStage(conditions);
      
      this.logger.log({
        action: 'filter_early_stage_success',
        total: result.total,
        hasTip: !!result.tip,
      });

      return result;
    } catch (error: any) {
      this.logger.error({
        action: 'filter_early_stage_error',
        error: error.message,
        conditions,
      });
      throw error;
    }
  }
}
