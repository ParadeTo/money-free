import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma 全局模块
 * 
 * @Global 装饰器使得 PrismaService 在整个应用中都可用，
 * 无需在每个模块中显式导入
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
