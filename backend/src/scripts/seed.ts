import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      preferences: JSON.stringify({
        defaultPeriod: 'daily',
        defaultIndicators: ['ma', 'volume'],
      }),
    },
  });

  console.log(`✅ Admin user created: ${admin.username} (ID: ${admin.userId})`);
  console.log('📝 Default credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
