// backend/src/modules/screener/screener.controller.ts
// T151 [US2] ScreenerController with POST /screener/execute endpoint

import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScreenerService } from './screener.service';
import { ExecuteFilterDto, FilterResultDto } from './dto/execute-filter.dto';

@ApiTags('screener')
@Controller('screener')
export class ScreenerController {
  private readonly logger = new Logger(ScreenerController.name);

  constructor(private readonly screenerService: ScreenerService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute stock filter',
    description:
      'Filter stocks based on technical indicator conditions (AND logic). Returns up to 100 matching stocks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filter executed successfully',
    type: FilterResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid filter conditions' })
  async executeFilter(@Body() dto: ExecuteFilterDto): Promise<FilterResultDto> {
    this.logger.log(
      `Executing filter with ${dto.conditions.length} condition(s)`,
    );

    const result = await this.screenerService.executeFilter(
      dto.conditions,
      dto.sortBy,
      dto.sortOrder,
    );

    this.logger.log(
      `Filter returned ${result.stocks.length} stocks (${result.totalCount} total, truncated: ${result.isTruncated})`,
    );

    return result;
  }
}
