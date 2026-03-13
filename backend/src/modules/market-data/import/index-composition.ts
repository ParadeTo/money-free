/**
 * 指数成分股管理服务
 * 处理指数成分股的获取、去重、合并逻辑
 */

import { Injectable, Logger } from '@nestjs/common';
import { ImportManager } from './import-manager';
import { IndexConstituent } from '../data-source/data-source.interface';

export interface IndexConfig {
  code: string;
  name: string;
  market: 'HK' | 'US';
}

export const HK_INDICES: IndexConfig[] = [
  { code: 'HSI', name: '恒生指数', market: 'HK' },
  { code: 'HSTECH', name: '恒生科技指数', market: 'HK' },
];

export const US_INDICES: IndexConfig[] = [
  { code: 'SP500', name: '标普500', market: 'US' },
  { code: 'NDX100', name: '纳斯达克100', market: 'US' },
];

@Injectable()
export class IndexCompositionService {
  private readonly logger: Logger;

  constructor(private readonly importManager: ImportManager) {
    this.logger = new Logger(IndexCompositionService.name);
  }

  async fetchHKConstituents(): Promise<{
    constituents: IndexConstituent[];
    stats: { total: number; byIndex: Record<string, number> };
  }> {
    this.logger.log('Fetching HK index constituents...');

    const allConstituents = new Map<string, IndexConstituent>();
    const stats: Record<string, number> = {};

    for (const index of HK_INDICES) {
      const result = await this.importManager.fetchIndexConstituentsWithFallback(
        index.code,
      );

      if (result.data) {
        stats[index.code] = result.data.length;

        for (const constituent of result.data) {
          const code = constituent.code.padStart(5, '0');
          if (!allConstituents.has(code)) {
            allConstituents.set(code, { ...constituent, code });
          }
        }

        this.logger.log(
          `✓ ${index.name} (${index.code}): ${result.data.length} stocks from ${result.source}`,
        );
      } else {
        this.logger.error(
          `✗ ${index.name} (${index.code}): Failed to fetch constituents`,
          result.errors,
        );
        stats[index.code] = 0;
      }
    }

    const constituents = Array.from(allConstituents.values());

    this.logger.log(
      `Total unique HK stocks: ${constituents.length} (from ${HK_INDICES.length} indices)`,
    );

    return {
      constituents,
      stats: {
        total: constituents.length,
        byIndex: stats,
      },
    };
  }

  async fetchUSConstituents(): Promise<{
    constituents: IndexConstituent[];
    stats: { total: number; byIndex: Record<string, number> };
  }> {
    this.logger.log('Fetching US index constituents...');

    const allConstituents = new Map<string, IndexConstituent>();
    const stats: Record<string, number> = {};

    for (const index of US_INDICES) {
      const result = await this.importManager.fetchIndexConstituentsWithFallback(
        index.code,
      );

      if (result.data) {
        stats[index.code] = result.data.length;

        for (const constituent of result.data) {
          const code = constituent.code.toUpperCase();
          if (!allConstituents.has(code)) {
            allConstituents.set(code, { ...constituent, code });
          }
        }

        this.logger.log(
          `✓ ${index.name} (${index.code}): ${result.data.length} stocks from ${result.source}`,
        );
      } else {
        this.logger.error(
          `✗ ${index.name} (${index.code}): Failed to fetch constituents`,
          result.errors,
        );
        stats[index.code] = 0;
      }
    }

    const constituents = Array.from(allConstituents.values());

    this.logger.log(
      `Total unique US stocks: ${constituents.length} (from ${US_INDICES.length} indices)`,
    );

    return {
      constituents,
      stats: {
        total: constituents.length,
        byIndex: stats,
      },
    };
  }

  formatStockCode(code: string, market: 'HK' | 'US'): string {
    if (market === 'HK') {
      return code.padStart(5, '0') + '.HK';
    } else {
      return code.toUpperCase() + '.US';
    }
  }

  normalizeStockCode(code: string, market: 'HK' | 'US'): string {
    if (market === 'HK') {
      return code.replace('.HK', '').padStart(5, '0');
    } else {
      return code.replace('.US', '').toUpperCase();
    }
  }
}
