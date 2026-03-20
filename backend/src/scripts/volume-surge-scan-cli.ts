#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VolumeSurgeService } from '../modules/volume-surge/volume-surge.service';
import { ScanMode, PersistentStock } from '../types/scan.types';
import * as fs from 'fs/promises';
import * as path from 'path';

let app: any;

async function getApp() {
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  }
  return app;
}

async function getVolumeSurgeService() {
  const appContext = await getApp();
  return appContext.get(VolumeSurgeService);
}

interface ScanOptions {
  mode: 'auto' | 'manual';
  date?: string;
  export?: string;
}

interface ExportOptions {
  scanId: string;
  format: 'csv' | 'markdown';
  output?: string;
  filter?: 'all' | 'matched';
}

interface CompareOptions {
  scan1: string;
  scan2: string;
  output?: string;
}

interface ListOptions {
  limit?: number;
  status?: string;
}

async function runScan(options: ScanOptions) {
  console.log('🚀 Starting Volume Surge Scan...\n');

  const mode = options.mode === 'auto' ? ScanMode.AUTO : ScanMode.MANUAL;
  const referenceDate = options.date || undefined;

  if (mode === ScanMode.MANUAL && !referenceDate) {
    console.error('❌ Error: --date is required when using --mode manual');
    process.exit(1);
  }

  try {
    const service = await getVolumeSurgeService();
    const result = await service.scan({
      mode,
      referenceDate,
      source: 'cli',
    });

    console.log(`✅ Scan started successfully`);
    console.log(`   Scan ID: ${result.scanId}\n`);
    console.log('⏳ Waiting for scan to complete...\n');

    let scanStatus = await service.getScanStatus(result.scanId);
    let retries = 0;
    const maxRetries = 120;

    while (scanStatus && scanStatus.status === 'RUNNING' && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      scanStatus = await service.getScanStatus(result.scanId);
      retries++;
      
      if (scanStatus && scanStatus.totalStocks > 0) {
        process.stdout.write(`\r   Progress: ${scanStatus.matchedStocks}/${scanStatus.totalStocks} stocks processed...`);
      }
    }

    console.log('\n');

    if (scanStatus) {
      if (scanStatus.status === 'COMPLETED') {
        console.log('✅ Scan completed successfully\n');
        console.log('📊 Summary:');
        console.log(`   Total Stocks: ${scanStatus.totalStocks}`);
        console.log(`   Matched Stocks: ${scanStatus.matchedStocks}`);
        console.log(
          `   Duration: ${scanStatus.durationMs ? (scanStatus.durationMs / 1000).toFixed(1) : 'N/A'}s\n`,
        );

        if (options.export) {
          await exportResults({
            scanId: result.scanId,
            format: options.export as 'csv' | 'markdown',
            output: `scan-${result.scanId}.${options.export === 'csv' ? 'csv' : 'md'}`,
            filter: 'matched',
          });
        }
      } else {
        console.error(`❌ Scan ended with status: ${scanStatus.status}`);
      }
    }

    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Scan failed:', error.message);
    await app?.close();
    process.exit(1);
  }
}

async function listScans(options: ListOptions) {
  const limit = options.limit || 20;

  try {
    const service = await getVolumeSurgeService();
    const result = await service.getScans({
      page: 1,
      limit,
      status: options.status,
    });

    const scans = result.scans;
    console.log(`\n📋 Recent Scans (showing ${scans.length}):\n`);

    scans.forEach((scan: any) => {
      const date = new Date(scan.scanDate).toISOString().split('T')[0];
      const statusIcon =
        scan.status === 'COMPLETED' ? '✅' : scan.status === 'RUNNING' ? '🔄' : '❌';
      console.log(
        `${statusIcon} ${scan.scanId.substring(0, 8)} | ${date} | ${scan.matchedStocks}/${scan.totalStocks} matched`,
      );
    });

    console.log('');
    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Failed to list scans:', error.message);
    await app?.close();
    process.exit(1);
  }
}

async function exportResults(options: ExportOptions) {
  console.log(`📥 Exporting scan results: ${options.scanId}...\n`);

  try {
    const service = await getVolumeSurgeService();
    const content = await service.exportResults(
      options.scanId,
      options.format,
      options.filter || 'matched',
    );

    const outputPath =
      options.output || `scan-${options.scanId}.${options.format === 'csv' ? 'csv' : 'md'}`;
    const fullPath = path.resolve(process.cwd(), outputPath);

    await fs.writeFile(fullPath, content, 'utf-8');

    console.log(`✅ Exported successfully to: ${fullPath}\n`);
    await app.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Export failed:', error.message);
    await app?.close();
    process.exit(1);
  }
}

async function compareScans(options: CompareOptions) {
  console.log(`🔍 Comparing scans: ${options.scan1} vs ${options.scan2}...\n`);

  try {
    const service = await getVolumeSurgeService();
    const result = await service.compareScans(options.scan1, options.scan2);

    console.log('📊 Comparison Summary:');
    console.log(`   Persistent Stocks: ${result.summary.persistentCount}`);
    console.log(`   Only in Scan 1: ${result.summary.onlyInScan1}`);
    console.log(`   Only in Scan 2: ${result.summary.onlyInScan2}\n`);

    if (result.persistentStocks.length > 0) {
      console.log('🎯 Persistent Stocks:\n');
      result.persistentStocks.forEach((stock: any) => {
        const trendIcon =
          stock.trend === 'improving' ? '↗' : stock.trend === 'declining' ? '↘' : '→';
        console.log(`   ${trendIcon} ${stock.stockCode} - ${stock.stockName}`);
        console.log(
          `      Ratio: ${stock.volumeSupportRatio1.toFixed(2)} → ${stock.volumeSupportRatio2.toFixed(2)}`,
        );
      });
      console.log('');
    }

    if (options.output) {
      const markdown = generateComparisonMarkdown(result);
      const fullPath = path.resolve(process.cwd(), options.output);
      await fs.writeFile(fullPath, markdown, 'utf-8');
      console.log(`✅ Comparison report saved to: ${fullPath}\n`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Comparison failed:', error.message);
    process.exit(1);
  }
}

function generateComparisonMarkdown(result: any): string {
  const date1 = new Date(result.scan1.scanDate).toISOString().split('T')[0];
  const date2 = new Date(result.scan2.scanDate).toISOString().split('T')[0];

  let markdown = `# Scan Comparison Report\n\n`;
  markdown += `## Overview\n\n`;
  markdown += `- **Scan 1**: ${date1} (${result.scan1.matchedStocks} matched)\n`;
  markdown += `- **Scan 2**: ${date2} (${result.scan2.matchedStocks} matched)\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Persistent Stocks**: ${result.summary.persistentCount}\n`;
  markdown += `- **Only in Scan 1**: ${result.summary.onlyInScan1}\n`;
  markdown += `- **Only in Scan 2**: ${result.summary.onlyInScan2}\n\n`;

  markdown += `## Persistent Stocks\n\n`;
  markdown += `| Stock Code | Name | Ratio (Scan 1) | Ratio (Scan 2) | Trend |\n`;
  markdown += `|------------|------|----------------|----------------|-------|\n`;

  result.persistentStocks.forEach((stock: PersistentStock) => {
    const trendIcon = stock.trend === 'improving' ? '↗' : stock.trend === 'declining' ? '↘' : '→';
    markdown += `| ${stock.stockCode} | ${stock.stockName} | ${stock.volumeSupportRatio1.toFixed(2)} | ${stock.volumeSupportRatio2.toFixed(2)} | ${trendIcon} ${stock.trend} |\n`;
  });

  return markdown;
}

yargs(hideBin(process.argv))
  .command(
    'scan',
    'Run a new volume surge scan',
    (yargs) => {
      return yargs
        .option('mode', {
          alias: 'm',
          type: 'string',
          choices: ['auto', 'manual'],
          default: 'auto',
          description: 'Scan mode: auto (detect reference date) or manual (specify date)',
        })
        .option('date', {
          alias: 'd',
          type: 'string',
          description: 'Reference date for manual mode (YYYY-MM-DD)',
        })
        .option('export', {
          alias: 'e',
          type: 'string',
          choices: ['csv', 'markdown'],
          description: 'Export results after scan',
        });
    },
    (argv) => {
      runScan(argv as any);
    },
  )
  .command(
    'list',
    'List recent scans',
    (yargs) => {
      return yargs
        .option('limit', {
          alias: 'l',
          type: 'number',
          default: 20,
          description: 'Number of scans to show',
        })
        .option('status', {
          alias: 's',
          type: 'string',
          choices: ['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
          description: 'Filter by status',
        });
    },
    (argv) => {
      listScans(argv as any);
    },
  )
  .command(
    'export <scanId>',
    'Export scan results',
    (yargs) => {
      return yargs
        .positional('scanId', {
          type: 'string',
          description: 'Scan ID to export',
        })
        .option('format', {
          alias: 'f',
          type: 'string',
          choices: ['csv', 'markdown'],
          default: 'markdown',
          description: 'Export format',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file path',
        })
        .option('filter', {
          type: 'string',
          choices: ['all', 'matched'],
          default: 'matched',
          description: 'Filter results',
        });
    },
    (argv) => {
      exportResults(argv as any);
    },
  )
  .command(
    'compare <scan1> <scan2>',
    'Compare two scans',
    (yargs) => {
      return yargs
        .positional('scan1', {
          type: 'string',
          description: 'First scan ID',
        })
        .positional('scan2', {
          type: 'string',
          description: 'Second scan ID',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Save comparison report to file',
        });
    },
    (argv) => {
      compareScans(argv as any);
    },
  )
  .demandCommand(1, 'You must provide a command')
  .strict()
  .help()
  .parse();
