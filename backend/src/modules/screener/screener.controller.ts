// backend/src/modules/screener/screener.controller.ts
// T151 [US2] ScreenerController with POST /screener/execute endpoint

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ScreenerService } from './screener.service';
import { ExecuteFilterDto, FilterResultDto } from './dto/execute-filter.dto';

@ApiTags('screener')
@Controller('screener')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
