import { Injectable } from '@nestjs/common';
import { PrismaService } from './modules/prisma/prisma.service';
import { checkDatabaseHealth } from './config/database.config';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Stock Analysis API is running!';
  }

  async getDatabaseHealth() {
    const health = await checkDatabaseHealth(this.prisma);
    return {
      ...health,
      timestamp: new Date().toISOString(),
    };
  }
}
