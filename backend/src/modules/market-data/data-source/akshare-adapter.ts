/**
 * AkShare 数据源适配器
 * 主要用于港股数据获取，美股作为备选
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import {
  IDataSourceAdapter,
  IndexConstituent,
  StockInfo,
  KlineRecord,
} from './data-source.interface';
import { DataSourceError, ErrorType } from './errors';
import { MarketType } from '../../../types/market-data';

@Injectable()
export class AkShareAdapter implements IDataSourceAdapter {
  readonly name = 'akshare' as const;
  private readonly logger: Logger;
  private readonly bridgeDir: string;
  private readonly pythonPath: string;

  constructor() {
    this.logger = new Logger(AkShareAdapter.name);
    this.bridgeDir = path.join(process.cwd(), '..', 'bridge');
    this.pythonPath = path.join(this.bridgeDir, 'venv', 'bin', 'python');
  }

  async fetchIndexConstituents(indexCode: string): Promise<IndexConstituent[]> {
    this.logger.log(`Fetching index constituents for ${indexCode} from AkShare`);

    try {
      const result = await this.callPythonBridge('fetch_hk_index_constituents.py', {
        index_code: indexCode,
      });

      if (!result.success) {
        throw new DataSourceError(
          'akshare',
          ErrorType.DATA_NOT_FOUND,
          result,
          `Failed to fetch index constituents: ${result.error}`,
        );
      }

      return result.data.map((item: any) => ({
        code: item.code,
        name: item.name,
        weight: item.weight,
      }));
    } catch (error) {
      if (error instanceof DataSourceError) {
        throw error;
      }
      throw this.handleError(error, 'fetchIndexConstituents');
    }
  }

  async fetchStockInfo(symbol: string, market: MarketType): Promise<StockInfo> {
    this.logger.log(`Fetching stock info for ${symbol} (${market}) from AkShare`);

    if (market !== MarketType.HK && market !== MarketType.US) {
      throw new DataSourceError(
        'akshare',
        ErrorType.INVALID_SYMBOL,
        null,
        `AkShare adapter does not support market: ${market}`,
      );
    }

    try {
      const scriptName =
        market === MarketType.HK
          ? 'fetch_hk_stock_info.py'
          : 'fetch_us_stock_info.py';

      const result = await this.callPythonBridge(scriptName, {
        symbol,
        market,
      });

      if (!result.success) {
        throw new DataSourceError(
          'akshare',
          ErrorType.DATA_NOT_FOUND,
          result,
          `Failed to fetch stock info: ${result.error}`,
        );
      }

      return {
        code: result.data.code,
        name: result.data.name,
        market,
        currency: result.data.currency,
        industry: result.data.industry,
        listDate: result.data.listDate,
        marketCap: result.data.marketCap,
      };
    } catch (error) {
      if (error instanceof DataSourceError) {
        throw error;
      }
      throw this.handleError(error, 'fetchStockInfo');
    }
  }

  async fetchKlineData(
    symbol: string,
    market: MarketType,
    startDate: string,
    endDate: string,
  ): Promise<KlineRecord[]> {
    this.logger.log(
      `Fetching K-line data for ${symbol} (${market}) from ${startDate} to ${endDate}`,
    );

    if (market !== MarketType.HK && market !== MarketType.US) {
      throw new DataSourceError(
        'akshare',
        ErrorType.INVALID_SYMBOL,
        null,
        `AkShare adapter does not support market: ${market}`,
      );
    }

    try {
      const scriptName =
        market === MarketType.HK ? 'fetch_hk_klines.py' : 'fetch_us_klines.py';

      const result = await this.callPythonBridge(scriptName, {
        symbol,
        start_date: startDate,
        end_date: endDate,
      });

      if (!result.success) {
        throw new DataSourceError(
          'akshare',
          ErrorType.DATA_NOT_FOUND,
          result,
          `Failed to fetch K-line data: ${result.error}`,
        );
      }

      return result.data.map((item: any) => ({
        date: item.date,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume),
        amount: parseFloat(item.amount),
      }));
    } catch (error) {
      if (error instanceof DataSourceError) {
        throw error;
      }
      throw this.handleError(error, 'fetchKlineData');
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      await this.callPythonBridge('test_connection.py', { source: 'akshare' });
      return true;
    } catch {
      return false;
    }
  }

  private async callPythonBridge(
    scriptName: string,
    args: any,
    timeout: number = 30000,
  ): Promise<any> {
    const scriptPath = path.join(this.bridgeDir, scriptName);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(
          new DataSourceError(
            'akshare',
            ErrorType.NETWORK_TIMEOUT,
            null,
            `Python script timeout after ${timeout}ms: ${scriptName}`,
          ),
        );
      }, timeout);

      const pythonProcess = spawn(this.pythonPath, [scriptPath], {
        cwd: this.bridgeDir,
      });

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      const inputJson = JSON.stringify(args);
      pythonProcess.stdin.write(inputJson);
      pythonProcess.stdin.end();

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          this.logger.error(`Python script failed with code ${code}: ${stderrData}`);
          reject(
            new DataSourceError(
              'akshare',
              ErrorType.SERVICE_UNAVAILABLE,
              { code, stderr: stderrData },
              `Python script error: ${stderrData || 'Unknown error'}`,
            ),
          );
          return;
        }

        try {
          const result = JSON.parse(stdoutData);
          resolve(result);
        } catch (error) {
          this.logger.error(`Failed to parse Python output: ${stdoutData}`);
          reject(
            new DataSourceError(
              'akshare',
              ErrorType.PARSE_ERROR,
              error,
              'Failed to parse Python script output',
            ),
          );
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        this.logger.error(`Failed to execute Python script: ${error.message}`);
        reject(
          new DataSourceError(
            'akshare',
            ErrorType.SERVICE_UNAVAILABLE,
            error,
            `Failed to execute Python script: ${error.message}`,
          ),
        );
      });
    });
  }

  private handleError(error: any, method: string): DataSourceError {
    this.logger.error(`Error in ${method}:`, error);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new DataSourceError(
        'akshare',
        ErrorType.NETWORK_TIMEOUT,
        error,
        `Network timeout in ${method}`,
      );
    }

    return new DataSourceError(
      'akshare',
      ErrorType.UNKNOWN,
      error,
      `Unknown error in ${method}: ${error.message || 'Unknown'}`,
    );
  }
}
