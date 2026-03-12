// backend/src/modules/strategies/strategies.controller.ts
// T152-T153 [US2] StrategiesController with POST, GET, PUT, DELETE endpoints

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { StrategiesService } from './strategies.service';
import { ScreenerService } from '../screener/screener.service';
import {
  CreateStrategyDto,
  UpdateStrategyDto,
  StrategyResponseDto,
} from './dto/create-strategy.dto';
import { FilterResultDto } from '../screener/dto/execute-filter.dto';

@ApiTags('strategies')
@Controller('strategies')
export class StrategiesController {
  private readonly logger = new Logger(StrategiesController.name);

  constructor(
    private readonly strategiesService: StrategiesService,
    private readonly screenerService: ScreenerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new screening strategy',
    description:
      'Save a screening strategy with multiple filter conditions for reuse',
  })
  @ApiResponse({
    status: 201,
    description: 'Strategy created successfully',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid strategy data' })
  async create(
    @Body() dto: CreateStrategyDto,
  ): Promise<StrategyResponseDto> {
    const userId = 'default-user';
    this.logger.log(`Creating strategy: ${dto.strategyName}`);

    return this.strategiesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all strategies',
    description: 'Retrieve all screening strategies',
  })
  @ApiResponse({
    status: 200,
    description: 'Strategies retrieved successfully',
    type: [StrategyResponseDto],
  })
  async findAll(): Promise<StrategyResponseDto[]> {
    const userId = 'default-user';
    this.logger.log(`Fetching all strategies`);

    return this.strategiesService.findAll(userId);
  }

  @Get(':strategyId')
  @ApiOperation({
    summary: 'Get strategy by ID',
    description: 'Retrieve a specific screening strategy',
  })
  @ApiParam({
    name: 'strategyId',
    description: 'Strategy ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Strategy retrieved successfully',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async findOne(
    @Param('strategyId') strategyId: string,
  ): Promise<StrategyResponseDto> {
    const userId = 'default-user';
    this.logger.log(`Fetching strategy ${strategyId}`);

    return this.strategiesService.findOne(userId, strategyId);
  }

  @Put(':strategyId')
  @ApiOperation({
    summary: 'Update strategy',
    description: 'Update an existing screening strategy',
  })
  @ApiParam({
    name: 'strategyId',
    description: 'Strategy ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Strategy updated successfully',
    type: StrategyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async update(
    @Param('strategyId') strategyId: string,
    @Body() dto: UpdateStrategyDto,
  ): Promise<StrategyResponseDto> {
    const userId = 'default-user';
    this.logger.log(`Updating strategy ${strategyId}`);

    return this.strategiesService.update(userId, strategyId, dto);
  }

  @Delete(':strategyId')
  @ApiOperation({
    summary: 'Delete strategy',
    description: 'Delete a screening strategy',
  })
  @ApiParam({
    name: 'strategyId',
    description: 'Strategy ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Strategy deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async remove(
    @Param('strategyId') strategyId: string,
  ): Promise<{ message: string }> {
    const userId = 'default-user';
    this.logger.log(`Deleting strategy ${strategyId}`);

    return this.strategiesService.remove(userId, strategyId);
  }

  @Post(':strategyId/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute saved strategy',
    description:
      'Execute a saved screening strategy and return matching stocks',
  })
  @ApiParam({
    name: 'strategyId',
    description: 'Strategy ID',
    example: 'uuid-here',
  })
  @ApiResponse({
    status: 200,
    description: 'Strategy executed successfully',
    type: FilterResultDto,
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async executeStrategy(
    @Param('strategyId') strategyId: string,
  ): Promise<FilterResultDto> {
    const userId = 'default-user';
    this.logger.log(`Executing strategy ${strategyId}`);

    // Get strategy conditions
    const conditions = await this.strategiesService.getConditions(
      userId,
      strategyId,
    );

    // Execute filter with conditions
    return this.screenerService.executeFilter(conditions);
  }
}
