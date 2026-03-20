import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VolumeSurgeService } from '../modules/volume-surge/volume-surge.service';
import { PrismaService } from '../modules/prisma/prisma.service';

async function verifyVolumeSurgeScan() {
  console.log('🔍 Verifying Volume Surge Scanner Setup...\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const prisma = app.get(PrismaService);
    const volumeSurgeService = app.get(VolumeSurgeService);

    console.log('✅ NestJS Application Context initialized');

    const stockCount = await prisma.stock.count();
    console.log(`✅ Database connection OK - Found ${stockCount.toLocaleString()} stocks`);

    const klineCount = await prisma.kLineData.count({ where: { period: 'daily' } });
    console.log(`✅ K-line data available - ${klineCount.toLocaleString()} daily records`);

    const scanCount = await prisma.volumeSurgeScan.count();
    console.log(`✅ Volume Surge Scan tables exist - ${scanCount} previous scans`);

    console.log('\n📊 Running a quick test scan (manual mode, date: 2026-03-02)...\n');

    const result = await volumeSurgeService.scan({
      mode: 'MANUAL',
      referenceDate: '2026-03-02',
      source: 'cli',
    });

    console.log(`✅ Scan completed successfully`);
    console.log(`   Scan ID: ${result.scanId}`);
    console.log(`   Status: ${result.status}\n`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const scanStatus = await volumeSurgeService.getScanStatus(result.scanId);
    if (scanStatus) {
      console.log('📊 Scan Results:');
      console.log(`   Total Stocks: ${scanStatus.totalStocks}`);
      console.log(`   Matched Stocks: ${scanStatus.matchedStocks}`);
      console.log(`   Duration: ${scanStatus.durationMs ? (scanStatus.durationMs / 1000).toFixed(1) : 'N/A'}s`);
    }

    console.log('\n✅ All verifications passed! Volume Surge Scanner is ready to use.\n');
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

verifyVolumeSurgeScan();
