import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { VcpService } from './vcp.service';
import { GetVcpScanDto } from './dto/get-vcp-scan.dto';
import { VcpScanResponseDto, VcpDetailResponseDto } from './dto/vcp-response.dto';
import { FilterEarlyStageRequestDto, FilterEarlyStageResponseDto } from './dto/filter-early-stage.dto';
import { GenerateVcpAnalysisDto } from './dto/generate-vcp-analysis.dto';
import { VcpAnalysisResponseDto } from './dto/vcp-analysis-response.dto';

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

  /**
   * Generate VCP analysis for a single stock (T025-T026 [US1])
   * 
   * @param stockCode Stock code
   * @param dto Query parameters (forceRefresh)
   * @returns Complete VCP analysis result
   */
  @Get(':stockCode/analysis')
  @ApiOperation({ summary: '生成单只股票的 VCP 分析报告' })
  @ApiParam({ 
    name: 'stockCode', 
    description: '股票代码', 
    example: '605117',
  })
  @ApiQuery({
    name: 'forceRefresh',
    required: false,
    type: Boolean,
    description: '是否强制实时重新计算（忽略缓存）',
    example: false,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'VCP 分析报告', 
    type: VcpAnalysisResponseDto,
  })
  @ApiResponse({ 
    status: 404, 
    description: '未找到股票代码',
    schema: {
      example: {
        statusCode: 404,
        message: '未找到股票代码 999999，请检查输入',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'K线数据不足',
    schema: {
      example: {
        statusCode: 400,
        message: '该股票暂无足够的K线数据进行VCP分析（需要至少30天数据）',
        error: 'Bad Request',
      },
    },
  })
  async generateAnalysis(
    @Param('stockCode') stockCode: string,
    @Query() dto: GenerateVcpAnalysisDto,
  ) {
    this.logger.log({
      action: 'vcp_analysis_request',
      stockCode,
      forceRefresh: dto.forceRefresh,
    });

    try {
      return await this.vcpService.generateAnalysis(stockCode, dto.forceRefresh);
    } catch (error: any) {
      this.logger.error({
        action: 'vcp_analysis_error',
        stockCode,
        error: error.message,
      });
      throw error;
    }
  }
}
