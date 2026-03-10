// backend/src/modules/strategies/strategies.service.ts
// T148 [US2] StrategiesService with create(), findAll(), findOne(), update(), delete()

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateStrategyDto, UpdateStrategyDto } from './dto/create-strategy.dto';

@Injectable()
export class StrategiesService {
  private readonly logger = new Logger(StrategiesService.name);
  private prisma = new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Create a new screening strategy with conditions
   */
  async create(userId: string, dto: CreateStrategyDto) {
    this.logger.log(
      `Creating strategy "${dto.strategyName}" for user ${userId}`,
    );

    try {
      const strategy = await this.prisma.screenerStrategy.create({
        data: {
          userId,
          strategyName: dto.strategyName,
          description: dto.description,
          conditions: {
            create: dto.conditions.map((condition) => ({
              conditionType: condition.conditionType,
              indicatorName: condition.indicatorName,
              operator: condition.operator,
              targetValue: condition.targetValue,
              pattern: condition.pattern,
              ma1Period: condition.ma1Period,
              ma2Period: condition.ma2Period,
              sortOrder: condition.sortOrder,
            })),
          },
        },
        include: {
          conditions: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      this.logger.log(`Strategy created with ID: ${strategy.strategyId}`);
      return this.mapToResponse(strategy);
    } catch (error: any) {
      this.logger.error(`Failed to create strategy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all strategies for a user
   */
  async findAll(userId: string) {
    this.logger.log(`Fetching all strategies for user ${userId}`);

    const strategies = await this.prisma.screenerStrategy.findMany({
      where: {
        userId,
      },
      include: {
        conditions: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return strategies.map((s: typeof strategies[number]) => this.mapToResponse(s));
  }

  /**
   * Find one strategy by ID
   */
  async findOne(userId: string, strategyId: string) {
    this.logger.log(`Fetching strategy ${strategyId} for user ${userId}`);

    const strategy = await this.prisma.screenerStrategy.findFirst({
      where: {
        strategyId,
        userId,
      },
      include: {
        conditions: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!strategy) {
      throw new NotFoundException(
        `Strategy with ID ${strategyId} not found`,
      );
    }

    return this.mapToResponse(strategy);
  }

  /**
   * Update an existing strategy
   */
  async update(
    userId: string,
    strategyId: string,
    dto: UpdateStrategyDto,
  ) {
    this.logger.log(`Updating strategy ${strategyId} for user ${userId}`);

    // Verify strategy exists and belongs to user
    const existing = await this.prisma.screenerStrategy.findFirst({
      where: {
        strategyId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Strategy with ID ${strategyId} not found`,
      );
    }

    try {
      // Update strategy and conditions
      const strategy = await this.prisma.screenerStrategy.update({
        where: {
          strategyId,
        },
        data: {
          strategyName: dto.strategyName ?? existing.strategyName,
          description: dto.description ?? existing.description,
          ...(dto.conditions && {
            conditions: {
              deleteMany: {},
              create: dto.conditions.map((condition) => ({
                conditionType: condition.conditionType,
                indicatorName: condition.indicatorName,
                operator: condition.operator,
                targetValue: condition.targetValue,
                pattern: condition.pattern,
                ma1Period: condition.ma1Period,
                ma2Period: condition.ma2Period,
                sortOrder: condition.sortOrder,
              })),
            },
          }),
        },
        include: {
          conditions: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      this.logger.log(`Strategy ${strategyId} updated successfully`);
      return this.mapToResponse(strategy);
    } catch (error: any) {
      this.logger.error(`Failed to update strategy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a strategy
   */
  async remove(userId: string, strategyId: string) {
    this.logger.log(`Deleting strategy ${strategyId} for user ${userId}`);

    // Verify strategy exists and belongs to user
    const existing = await this.prisma.screenerStrategy.findFirst({
      where: {
        strategyId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Strategy with ID ${strategyId} not found`,
      );
    }

    try {
      await this.prisma.screenerStrategy.delete({
        where: {
          strategyId,
        },
      });

      this.logger.log(`Strategy ${strategyId} deleted successfully`);
      return { message: 'Strategy deleted successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to delete strategy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conditions for a strategy (for execution)
   */
  async getConditions(userId: string, strategyId: string) {
    const strategy = await this.findOne(userId, strategyId);
    return strategy.conditions;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(strategy: any) {
    return {
      strategyId: strategy.strategyId,
      userId: strategy.userId,
      strategyName: strategy.strategyName,
      description: strategy.description,
      conditions: strategy.conditions.map((c: any) => ({
        conditionType: c.conditionType,
        indicatorName: c.indicatorName,
        operator: c.operator,
        targetValue: c.targetValue,
        pattern: c.pattern,
        ma1Period: c.ma1Period,
        ma2Period: c.ma2Period,
        sortOrder: c.sortOrder,
      })),
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
    };
  }
}
