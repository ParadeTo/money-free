import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * 初始化用户脚本
 * 创建默认的测试用户
 */
async function initUser() {
  console.log('🚀 Starting user initialization...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    // 检查是否已存在用户
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (existingUser) {
      console.log('⚠️  User "admin" already exists.');
      console.log('   User ID:', existingUser.userId);
      console.log('   Created at:', existingUser.createdAt);
      return;
    }

    // 创建默认管理员用户
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        preferences: JSON.stringify({
          theme: 'light',
          defaultTimeRange: '1Y',
          defaultPeriod: 'daily',
        }),
      },
    });

    console.log('✅ Default user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n👤 User Info:');
    console.log('   User ID:', user.userId);
    console.log('   Created at:', user.createdAt);
    console.log('\n⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

initUser()
  .then(() => {
    console.log('\n✨ User initialization completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
