import { Module } from '@nestjs/common';
import { KLinesController } from './klines.controller';
import { KLinesService } from './klines.service';

@Module({
  controllers: [KLinesController],
  providers: [KLinesService],
  exports: [KLinesService],
})
export class KLinesModule {}
