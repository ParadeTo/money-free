/**
 * Yahoo Finance 数据源适配器
 * 主要用于美股数据获取，港股作为备选
 */

import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  IDataSourceAdapter,
  IndexConstituent,
  StockInfo,
  KlineRecord,
} from './data-source.interface';
import { DataSourceError, ErrorType } from './errors';
import { MarketType, CurrencyType } from '../../../types/market-data';

@Injectable()
export class YahooFinanceAdapter implements IDataSourceAdapter {
  readonly name = 'yahoo_finance' as const;
  private readonly logger: Logger;
  private readonly bridgeDir: string;
  private readonly pythonPath: string;

  constructor() {
    this.logger = new Logger(YahooFinanceAdapter.name);
    this.bridgeDir = path.join(process.cwd(), '..', 'bridge');
    this.pythonPath = path.join(this.bridgeDir, 'venv', 'bin', 'python');
  }

  async fetchIndexConstituents(indexCode: string): Promise<IndexConstituent[]> {
    this.logger.log(
      `Fetching index constituents for ${indexCode} from Yahoo Finance`,
    );

    const validIndices = ['HSI', 'HSTECH', 'SP500', 'NDX100'];
    if (!validIndices.includes(indexCode)) {
      throw new DataSourceError(
        'yahoo_finance',
        ErrorType.INVALID_SYMBOL,
        null,
        `Yahoo Finance adapter does not support index: ${indexCode}`,
      );
    }

    const constituentsFile = path.join(
      process.cwd(),
      'data',
      'index-constituents',
      `${indexCode.toLowerCase()}.json`,
    );

    if (!fs.existsSync(constituentsFile)) {
      throw new DataSourceError(
        'yahoo_finance',
        ErrorType.DATA_NOT_FOUND,
        null,
        `Constituents file not found: ${constituentsFile}`,
      );
    }

    try {
      const data = JSON.parse(fs.readFileSync(constituentsFile, 'utf-8'));
      return data.constituents || data;
    } catch (error) {
      throw new DataSourceError(
        'yahoo_finance',
        ErrorType.PARSE_ERROR,
        error,
        `Failed to parse constituents file: ${constituentsFile}`,
      );
    }
  }

  async fetchStockInfo(symbol: string, market: MarketType): Promise<StockInfo> {
    this.logger.log(
      `Fetching stock info for ${symbol} (${market}) from Yahoo Finance`,
    );

    if (market !== MarketType.HK && market !== MarketType.US) {
      throw new DataSourceError(
        'yahoo_finance',
        ErrorType.INVALID_SYMBOL,
        null,
        `Yahoo Finance adapter does not support market: ${market}`,
      );
    }

    try {
      const formattedSymbol = this.formatSymbol(symbol, market);
      const result = await this.callPythonBridge('yahoo_finance_stock_info.py', {
        symbol: formattedSymbol,
        market,
      });

      if (!result.success) {
        throw new DataSourceError(
          'yahoo_finance',
          ErrorType.DATA_NOT_FOUND,
          result,
          `Failed to fetch stock info: ${result.error}`,
        );
      }

      return {
        code: symbol,
        name: result.data.name,
        market,
        currency: this.getCurrency(market),
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
        'yahoo_finance',
        ErrorType.INVALID_SYMBOL,
        null,
        `Yahoo Finance adapter does not support market: ${market}`,
      );
    }

    try {
      const formattedSymbol = this.formatSymbol(symbol, market);
      const result = await this.callPythonBridge('yahoo_finance_klines.py', {
        symbol: formattedSymbol,
        start_date: startDate,
        end_date: endDate,
      });

      if (!result.success) {
        throw new DataSourceError(
          'yahoo_finance',
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
        amount: parseFloat(item.amount || item.close * item.volume),
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
      await this.fetchStockInfo('AAPL', MarketType.US);
      return true;
    } catch {
      return false;
    }
  }

  private formatSymbol(symbol: string, market: MarketType): string {
    if (market === MarketType.HK) {
      const numericPart = parseInt(symbol, 10);
      const formatted = numericPart.toString().padStart(4, '0');
      return formatted + '.HK';
    } else if (market === MarketType.US) {
      return symbol;
    }
    throw new Error(`Unsupported market: ${market}`);
  }

  private getCurrency(market: MarketType): CurrencyType {
    switch (market) {
      case MarketType.HK:
        return CurrencyType.HKD;
      case MarketType.US:
        return CurrencyType.USD;
      default:
        return CurrencyType.CNY;
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
            'yahoo_finance',
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
              'yahoo_finance',
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
              'yahoo_finance',
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
            'yahoo_finance',
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
        'yahoo_finance',
        ErrorType.NETWORK_TIMEOUT,
        error,
        `Network timeout in ${method}`,
      );
    }

    return new DataSourceError(
      'yahoo_finance',
      ErrorType.UNKNOWN,
      error,
      `Unknown error in ${method}: ${error.message || 'Unknown'}`,
    );
  }
}
