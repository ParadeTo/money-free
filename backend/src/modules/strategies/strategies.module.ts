// backend/src/modules/strategies/strategies.module.ts

import { Module } from '@nestjs/common';
import { StrategiesController } from './strategies.controller';
import { StrategiesService } from './strategies.service';
import { ScreenerModule } from '../screener/screener.module';

@Module({
  imports: [ScreenerModule],
  controllers: [StrategiesController],
  providers: [StrategiesService],
  exports: [StrategiesService],
})
export class StrategiesModule {}
