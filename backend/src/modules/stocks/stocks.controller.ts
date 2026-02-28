import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StocksService } from './stocks.service';
import { SearchStockDto } from './dto/search-stock.dto';

@ApiTags('stocks')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('search')
  @ApiOperation({ summary: '搜索股票' })
  @ApiResponse({ status: 200, description: '返回股票列表' })
  async search(@Query() dto: SearchStockDto) {
    return this.stocksService.search(dto);
  }

  @Get(':stockCode')
  @ApiOperation({ summary: '获取股票详情' })
  @ApiResponse({ status: 200, description: '返回股票详情' })
  @ApiResponse({ status: 404, description: '股票不存在' })
  async getDetail(@Param('stockCode') stockCode: string) {
    return this.stocksService.getStockDetail(stockCode);
  }
}
