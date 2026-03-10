import { Injectable, Logger } from '@nestjs/common';
import { PythonBridgeService } from '../python-bridge/python-bridge.service';
import * as path from 'path';

export interface AkShareKLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

@Injectable()
export class AkShareService {
  private readonly logger = new Logger(AkShareService.name);

  constructor(private pythonBridge: PythonBridgeService) {}

  /**
   * 获取日线数据（前复权）
   */
  async getDailyKLine(params: {
    symbol: string;
    start_date?: string; // YYYY-MM-DD
    end_date?: string;   // YYYY-MM-DD
  }): Promise<AkShareKLineData[]> {
    try {
      // 转换 symbol 为纯代码 (去除 sh/sz 前缀)
      const stockCode = params.symbol.replace(/^(sh|sz)/i, '');
      
      // 转换日期格式 YYYY-MM-DD -> YYYYMMDD
      const startDate = params.start_date?.replace(/-/g, '');
      const endDate = params.end_date?.replace(/-/g, '');

      const result = await this.pythonBridge.execute<any>(
        'akshare_fetcher.py',
        {
          stock_code: stockCode,
          period: 'daily',
          start_date: startDate,
          end_date: endDate,
        },
      );

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to fetch data from AkShare');
      }

      return result.data as AkShareKLineData[];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch daily kline for ${params.symbol}: ${err.message}`);
      throw error;
    }
  }

  /**
   * 获取周线数据（前复权）
   */
  async getWeeklyKLine(params: {
    symbol: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AkShareKLineData[]> {
    try {
      // 转换 symbol 为纯代码 (去除 sh/sz 前缀)
      const stockCode = params.symbol.replace(/^(sh|sz)/i, '');
      
      // 转换日期格式 YYYY-MM-DD -> YYYYMMDD
      const startDate = params.start_date?.replace(/-/g, '');
      const endDate = params.end_date?.replace(/-/g, '');

      const result = await this.pythonBridge.execute<any>(
        'akshare_fetcher.py',
        {
          stock_code: stockCode,
          period: 'weekly',
          start_date: startDate,
          end_date: endDate,
        },
      );

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to fetch data from AkShare');
      }

      return result.data as AkShareKLineData[];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch weekly kline for ${params.symbol}: ${err.message}`);
      throw error;
    }
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.pythonBridge.execute<any>('health_check.py', {});
      return result.success === true;
    } catch {
      return false;
    }
  }
}
