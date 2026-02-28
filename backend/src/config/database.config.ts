import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseConfig');

/**
 * SQLite 性能优化配置
 * 
 * WAL (Write-Ahead Logging) 模式:
 * - 提升并发性能，读写可以同时进行
 * - 更快的写入速度
 * - 更好的并发支持
 * 
 * 性能参数:
 * - cache_size: -64000 (约 64MB 缓存)
 * - journal_mode: WAL (写前日志模式)
 * - synchronous: NORMAL (平衡性能和安全性)
 * - temp_store: MEMORY (临时数据存储在内存)
 * - mmap_size: 30000000000 (约 30GB mmap)
 */
export async function configureSQLite(prisma: PrismaClient): Promise<void> {
  try {
    // 启用 WAL 模式 (PRAGMA 返回结果，使用 queryRawUnsafe)
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    logger.log('✅ SQLite WAL mode enabled');

    // 设置缓存大小 (64MB)
    await prisma.$queryRawUnsafe('PRAGMA cache_size = -64000;');
    logger.log('✅ Cache size set to 64MB');

    // 设置同步模式为 NORMAL (平衡性能和安全性)
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    logger.log('✅ Synchronous mode set to NORMAL');

    // 临时数据存储在内存中
    await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
    logger.log('✅ Temp store set to MEMORY');

    // 设置 mmap size (30GB)
    await prisma.$queryRawUnsafe('PRAGMA mmap_size = 30000000000;');
    logger.log('✅ MMAP size set to 30GB');

    // 启用外键约束
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    logger.log('✅ Foreign keys enabled');

    // 记录当前配置
    const config = await prisma.$queryRawUnsafe<any[]>('PRAGMA compile_options;');
    logger.debug('SQLite compile options:', config);

    logger.log('🎉 SQLite performance optimization complete');
  } catch (error) {
    logger.error('❌ Failed to configure SQLite:', error);
    throw error;
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(prisma: PrismaClient): Promise<{
  journalMode: string;
  pageSize: number;
  cacheSize: number;
  synchronous: string;
  walCheckpoint: any[];
}> {
  const [journalMode] = await prisma.$queryRawUnsafe<any[]>('PRAGMA journal_mode;');
  const [pageSize] = await prisma.$queryRawUnsafe<any[]>('PRAGMA page_size;');
  const [cacheSize] = await prisma.$queryRawUnsafe<any[]>('PRAGMA cache_size;');
  const [synchronous] = await prisma.$queryRawUnsafe<any[]>('PRAGMA synchronous;');
  const walCheckpoint = await prisma.$queryRawUnsafe<any[]>('PRAGMA wal_checkpoint;');

  return {
    journalMode: journalMode.journal_mode,
    pageSize: pageSize.page_size,
    cacheSize: cacheSize.cache_size,
    synchronous: synchronous.synchronous,
    walCheckpoint,
  };
}

/**
 * 数据库健康检查
 */
export async function checkDatabaseHealth(prisma: PrismaClient): Promise<{
  connected: boolean;
  integrityCheck: boolean;
  stats: any;
}> {
  try {
    // 连接性检查
    await prisma.$queryRaw`SELECT 1`;
    
    // 完整性检查
    const [integrity] = await prisma.$queryRawUnsafe<any[]>('PRAGMA integrity_check;');
    const integrityCheck = integrity.integrity_check === 'ok';

    // 获取统计信息
    const stats = await getDatabaseStats(prisma);

    return {
      connected: true,
      integrityCheck,
      stats,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      connected: false,
      integrityCheck: false,
      stats: null,
    };
  }
}

/**
 * 执行 WAL checkpoint (定期清理)
 */
export async function walCheckpoint(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
    logger.log('✅ WAL checkpoint executed');
  } catch (error) {
    logger.error('❌ WAL checkpoint failed:', error);
    throw error;
  }
}
