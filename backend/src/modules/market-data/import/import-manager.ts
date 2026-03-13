/**
 * 导入管理器
 * 实现智能数据源切换和错误处理
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IDataSourceAdapter,
  IndexConstituent,
  StockInfo,
  KlineRecord,
} from '../data-source/data-source.interface';
import { DataSourceError, ErrorType } from '../data-source/errors';
import { MarketType } from '../../../types/market-data';
import { fetchWithRetry } from '../utils/retry';

export interface ImportManagerConfig {
  primaryAdapter: IDataSourceAdapter;
  backupAdapter: IDataSourceAdapter;
  retryAttempts?: number;
}

export interface FetchResult<T> {
  data: T | null;
  source: 'akshare' | 'yahoo_finance' | null;
  errors: Array<{
    source: 'akshare' | 'yahoo_finance';
    errorType: ErrorType;
    errorMessage: string;
  }>;
}

@Injectable()
export class ImportManager {
  private readonly logger: Logger;

  constructor(private readonly config: ImportManagerConfig) {
    this.logger = new Logger(ImportManager.name);
  }

  async fetchIndexConstituentsWithFallback(
    indexCode: string,
  ): Promise<FetchResult<IndexConstituent[]>> {
    const errors: FetchResult<IndexConstituent[]>['errors'] = [];

    try {
      this.logger.log(
        `Fetching index constituents for ${indexCode} from ${this.config.primaryAdapter.name}`,
      );

      const data = await fetchWithRetry(
        () => this.config.primaryAdapter.fetchIndexConstituents(indexCode),
        {
          maxAttempts: this.config.retryAttempts || 3,
          onRetry: (attempt, error) => {
            this.logger.warn(
              `Retry attempt ${attempt} for ${indexCode} from ${this.config.primaryAdapter.name}`,
            );
          },
        },
      );

      return {
        data,
        source: this.config.primaryAdapter.name,
        errors: [],
      };
    } catch (primaryError) {
      if (primaryError instanceof DataSourceError) {
        errors.push({
          source: primaryError.source,
          errorType: primaryError.errorType,
          errorMessage: primaryError.message,
        });
      }

      this.logger.warn(
        `Primary adapter ${this.config.primaryAdapter.name} failed, trying backup ${this.config.backupAdapter.name}`,
      );

      try {
        const data = await fetchWithRetry(
          () => this.config.backupAdapter.fetchIndexConstituents(indexCode),
          {
            maxAttempts: this.config.retryAttempts || 3,
            onRetry: (attempt, error) => {
              this.logger.warn(
                `Retry attempt ${attempt} for ${indexCode} from ${this.config.backupAdapter.name}`,
              );
            },
          },
        );

        return {
          data,
          source: this.config.backupAdapter.name,
          errors,
        };
      } catch (backupError) {
        if (backupError instanceof DataSourceError) {
          errors.push({
            source: backupError.source,
            errorType: backupError.errorType,
            errorMessage: backupError.message,
          });
        }

        this.logger.error(
          `Both adapters failed for index ${indexCode}`,
          errors,
        );

        return {
          data: null,
          source: null,
          errors,
        };
      }
    }
  }

  async fetchStockInfoWithFallback(
    symbol: string,
    market: MarketType,
  ): Promise<FetchResult<StockInfo>> {
    const errors: FetchResult<StockInfo>['errors'] = [];

    try {
      this.logger.debug(
        `Fetching stock info for ${symbol} (${market}) from ${this.config.primaryAdapter.name}`,
      );

      const data = await fetchWithRetry(
        () => this.config.primaryAdapter.fetchStockInfo(symbol, market),
        {
          maxAttempts: this.config.retryAttempts || 3,
        },
      );

      return {
        data,
        source: this.config.primaryAdapter.name,
        errors: [],
      };
    } catch (primaryError) {
      if (primaryError instanceof DataSourceError) {
        errors.push({
          source: primaryError.source,
          errorType: primaryError.errorType,
          errorMessage: primaryError.message,
        });

        if (primaryError.errorType === ErrorType.INVALID_SYMBOL) {
          this.logger.warn(`Invalid symbol ${symbol}, skipping backup adapter`);
          return {
            data: null,
            source: null,
            errors,
          };
        }
      }

      this.logger.warn(
        `Primary adapter failed for ${symbol}, trying backup ${this.config.backupAdapter.name}`,
      );

      try {
        const data = await fetchWithRetry(
          () => this.config.backupAdapter.fetchStockInfo(symbol, market),
          {
            maxAttempts: this.config.retryAttempts || 3,
          },
        );

        return {
          data,
          source: this.config.backupAdapter.name,
          errors,
        };
      } catch (backupError) {
        if (backupError instanceof DataSourceError) {
          errors.push({
            source: backupError.source,
            errorType: backupError.errorType,
            errorMessage: backupError.message,
          });
        }

        this.logger.error(`Both adapters failed for stock ${symbol}`, errors);

        return {
          data: null,
          source: null,
          errors,
        };
      }
    }
  }

  async fetchKlineDataWithFallback(
    symbol: string,
    market: MarketType,
    startDate: string,
    endDate: string,
  ): Promise<FetchResult<KlineRecord[]>> {
    const errors: FetchResult<KlineRecord[]>['errors'] = [];

    try {
      this.logger.debug(
        `Fetching K-line data for ${symbol} (${market}) from ${this.config.primaryAdapter.name}`,
      );

      const data = await fetchWithRetry(
        () =>
          this.config.primaryAdapter.fetchKlineData(
            symbol,
            market,
            startDate,
            endDate,
          ),
        {
          maxAttempts: this.config.retryAttempts || 3,
        },
      );

      return {
        data,
        source: this.config.primaryAdapter.name,
        errors: [],
      };
    } catch (primaryError) {
      if (primaryError instanceof DataSourceError) {
        errors.push({
          source: primaryError.source,
          errorType: primaryError.errorType,
          errorMessage: primaryError.message,
        });

        if (primaryError.errorType === ErrorType.INVALID_SYMBOL) {
          this.logger.warn(`Invalid symbol ${symbol}, skipping backup adapter`);
          return {
            data: null,
            source: null,
            errors,
          };
        }
      }

      this.logger.warn(
        `Primary adapter failed for ${symbol} K-line, trying backup ${this.config.backupAdapter.name}`,
      );

      try {
        const data = await fetchWithRetry(
          () =>
            this.config.backupAdapter.fetchKlineData(
              symbol,
              market,
              startDate,
              endDate,
            ),
          {
            maxAttempts: this.config.retryAttempts || 3,
          },
        );

        return {
          data,
          source: this.config.backupAdapter.name,
          errors,
        };
      } catch (backupError) {
        if (backupError instanceof DataSourceError) {
          errors.push({
            source: backupError.source,
            errorType: backupError.errorType,
            errorMessage: backupError.message,
          });
        }

        this.logger.error(
          `Both adapters failed for stock ${symbol} K-line`,
          errors,
        );

        return {
          data: null,
          source: null,
          errors,
        };
      }
    }
  }
}
