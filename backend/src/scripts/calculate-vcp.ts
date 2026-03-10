import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VcpScannerService } from '../services/vcp/vcp-scanner.service';
import { Logger } from '@nestjs/common';

async function main() {
  const logger = new Logger('CalculateVCP');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const scanner = app.get(VcpScannerService);
    const startTime = Date.now();

    logger.log('Starting VCP batch calculation...');
    const result = await scanner.scanAllStocks();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.log(JSON.stringify({
      event: 'vcp_scan_complete',
      ...result,
      elapsedSeconds: elapsed,
    }));
  } catch (error: any) {
    logger.error(`VCP calculation failed: ${error.message}`);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
