import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { KLinesService } from './klines.service';
import { GetKLinesDto } from './dto/get-klines.dto';

@ApiTags('kline')
@Controller('klines')
export class KLinesController {
  constructor(private readonly klinesService: KLinesService) {}

  @Get(':stockCode')
  @ApiOperation({ summary: '获取股票K线数据' })
  @ApiParam({ name: 'stockCode', description: '股票代码', example: '600519' })
  @ApiResponse({ status: 200, description: '返回K线数据' })
  @ApiResponse({ status: 404, description: '股票不存在' })
  async getKLines(
    @Param('stockCode') stockCode: string,
    @Query() dto: GetKLinesDto,
  ) {
    return this.klinesService.getKLineData(stockCode, dto);
  }
}
