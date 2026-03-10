import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IndicatorsService } from './indicators.service';
import { GetIndicatorsDto } from './dto/get-indicators.dto';

@ApiTags('indicators')
@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get(':stockCode')
  @ApiOperation({ summary: '获取股票技术指标' })
  @ApiParam({ name: 'stockCode', description: '股票代码', example: '600519' })
  @ApiResponse({ status: 200, description: '返回技术指标数据' })
  @ApiResponse({ status: 404, description: '股票不存在' })
  async getIndicators(
    @Param('stockCode') stockCode: string,
    @Query() dto: GetIndicatorsDto,
  ) {
    return this.indicatorsService.getIndicators(stockCode, dto);
  }

  @Get(':stockCode/week52-markers')
  @ApiOperation({ summary: '获取52周最高/最低标注' })
  @ApiParam({ name: 'stockCode', description: '股票代码', example: '600519' })
  @ApiResponse({ status: 200, description: '返回52周标注' })
  @ApiResponse({ status: 404, description: '股票不存在或无标注数据' })
  async get52WeekMarkers(
    @Param('stockCode') stockCode: string,
    @Query('period') period?: 'daily' | 'weekly',
  ) {
    return this.indicatorsService.get52WeekMarkers(stockCode, period);
  }
}
