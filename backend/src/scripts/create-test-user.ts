import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user...');

  const username = 'admin';
  const password = 'admin123';

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log(`User "${username}" already exists with ID: ${existingUser.userId}`);
    return;
  }

  // Hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create the user
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      preferences: JSON.stringify({
        defaultPeriod: 'daily',
        defaultIndicators: ['ma', 'volume'],
      }),
    },
  });

  console.log('✅ Test user created successfully!');
  console.log('   Username:', username);
  console.log('   Password:', password);
  console.log('   User ID:', user.userId);
  console.log('\n📝 Use these credentials to login to the application.');
}

main()
  .catch((e) => {
    console.error('❌ Error creating test user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
