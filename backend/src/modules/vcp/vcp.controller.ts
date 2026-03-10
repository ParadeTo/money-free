import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { VcpService } from './vcp.service';
import { GetVcpScanDto } from './dto/get-vcp-scan.dto';
import { VcpScanResponseDto, VcpDetailResponseDto } from './dto/vcp-response.dto';

@ApiTags('vcp')
@Controller('vcp')
export class VcpController {
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
}
