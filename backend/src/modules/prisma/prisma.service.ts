import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { configureSQLite } from '../../config/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Connecting to database...');
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // 配置 SQLite 性能优化
      await configureSQLite(this);
      this.logger.log('✅ SQLite performance optimization applied');

      // 设置查询日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        this.$on('query' as never, (e: any) => {
          this.logger.debug(`Query: ${e.query}`);
          this.logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      this.$on('error' as never, (e: any) => {
        this.logger.error('Prisma error:', e);
      });

      this.$on('warn' as never, (e: any) => {
        this.logger.warn('Prisma warning:', e);
      });
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Disconnecting from database...');
      await this.$disconnect();
      this.logger.log('✅ Database disconnected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to disconnect from database:', error);
      throw error;
    }
  }

  /**
   * 清理连接池（用于测试或维护）
   */
  async cleanUp(): Promise<void> {
    await this.$disconnect();
    await this.$connect();
    await configureSQLite(this);
  }
}
