import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TushareKLineData {
  ts_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
}

export interface TushareStockBasic {
  ts_code: string;
  symbol: string;
  name: string;
  area: string;
  industry: string;
  market: string;
  list_date: string;
}

@Injectable()
export class TushareService {
  private readonly logger = new Logger(TushareService.name);
  private readonly apiUrl = 'http://api.tushare.pro';
  private readonly token: string;
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.token = this.configService.get<string>('TUSHARE_TOKEN') || '';
    
    if (!this.token) {
      this.logger.warn('⚠️ TUSHARE_TOKEN not configured. Tushare service will not work.');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 获取股票基本信息
   */
  async getStockBasic(params?: {
    exchange?: 'SSE' | 'SZSE';
    list_status?: 'L' | 'D' | 'P';
    ts_code?: string;
  }): Promise<TushareStockBasic[]> {
    try {
      const response = await this.client.post('', {
        api_name: 'stock_basic',
        token: this.token,
        params: params || {},
        fields: 'ts_code,symbol,name,area,industry,market,list_date',
      });

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const items = response.data.data.items || [];
      const fields = response.data.data.fields || [];

      return items.map((item: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, index: number) => {
          obj[field] = item[index];
        });
        return obj as TushareStockBasic;
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch stock basic: ${err.message}`);
      throw error;
    }
  }

  /**
   * 获取复权因子
   */
  async getAdjFactor(params: {
    ts_code: string;
    start_date?: string; // YYYYMMDD
    end_date?: string;   // YYYYMMDD
    trade_date?: string; // YYYYMMDD
  }): Promise<Array<{ ts_code: string; trade_date: string; adj_factor: number }>> {
    try {
      const response = await this.client.post('', {
        api_name: 'adj_factor',
        token: this.token,
        params: params,
        fields: 'ts_code,trade_date,adj_factor',
      });

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const items = response.data.data.items || [];
      const fields = response.data.data.fields || [];

      return items.map((item: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, index: number) => {
          obj[field] = item[index];
        });
        return obj;
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch adj factor for ${params.ts_code}: ${err.message}`);
      throw error;
    }
  }

  /**
   * 获取日线数据（前复权）
   * 注意：Tushare 的 daily API 不支持复权参数，需要通过 adj_factor 接口获取复权因子后自行计算
   */
  async getDailyKLine(params: {
    ts_code: string;
    start_date?: string; // YYYYMMDD
    end_date?: string;   // YYYYMMDD
  }): Promise<TushareKLineData[]> {
    try {
      // 1. 获取不复权数据
      const response = await this.client.post('', {
        api_name: 'daily',
        token: this.token,
        params: params,
        fields: 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount',
      });

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const items = response.data.data.items || [];
      const fields = response.data.data.fields || [];

      const klineData: TushareKLineData[] = items.map((item: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, index: number) => {
          obj[field] = item[index];
        });
        return obj as TushareKLineData;
      });

      if (klineData.length === 0) {
        return [];
      }

      // 2. 获取复权因子（需要获取到当前最新的复权因子）
      // 将 end_date 扩展到当前日期，以确保获取到最新的复权因子
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const adjFactors = await this.getAdjFactor({
        ts_code: params.ts_code,
        start_date: params.start_date,
        end_date: today, // 使用当前日期作为结束日期
      });

      // 3. 获取最新复权因子（用于前复权计算）
      // 复权因子是按日期倒序返回的，第一个就是最新的
      const latestFactor = adjFactors.length > 0 ? adjFactors[0].adj_factor : 1;

      // 4. 构建日期到复权因子的映射
      const factorMap = new Map<string, number>();
      adjFactors.forEach(item => {
        factorMap.set(item.trade_date, item.adj_factor);
      });

      // 5. 应用前复权计算：前复权价 = 不复权价 × (当日复权因子 / 最新复权因子)
      const adjustedData = klineData.map(item => {
        const factor = factorMap.get(item.trade_date) || latestFactor;
        const ratio = factor / latestFactor;

        return {
          ...item,
          open: item.open * ratio,
          high: item.high * ratio,
          low: item.low * ratio,
          close: item.close * ratio,
          pre_close: item.pre_close * ratio,
          change: item.change * ratio,
          // pct_chg 和 vol、amount 不需要调整
        };
      });

      return adjustedData;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch daily kline for ${params.ts_code}: ${err.message}`);
      throw error;
    }
  }

  /**
   * 获取周线数据（前复权）
   * 注意：Tushare 的 weekly API 不支持复权参数，需要通过 adj_factor 接口获取复权因子后自行计算
   */
  async getWeeklyKLine(params: {
    ts_code: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TushareKLineData[]> {
    try {
      // 1. 获取不复权数据
      const response = await this.client.post('', {
        api_name: 'weekly',
        token: this.token,
        params: params,
        fields: 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount',
      });

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const items = response.data.data.items || [];
      const fields = response.data.data.fields || [];

      const klineData: TushareKLineData[]= items.map((item: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, index: number) => {
          obj[field] = item[index];
        });
        return obj as TushareKLineData;
      });

      if (klineData.length === 0) {
        return [];
      }

      // 2. 获取复权因子（需要获取到当前最新的复权因子）
      // 将 end_date 扩展到当前日期，以确保获取到最新的复权因子
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const adjFactors = await this.getAdjFactor({
        ts_code: params.ts_code,
        start_date: params.start_date,
        end_date: today, // 使用当前日期作为结束日期
      });

      // 3. 获取最新复权因子（用于前复权计算）
      // 复权因子是按日期倒序返回的，第一个就是最新的
      const latestFactor = adjFactors.length > 0 ? adjFactors[0].adj_factor : 1;

      // 4. 构建日期到复权因子的映射
      const factorMap = new Map<string, number>();
      adjFactors.forEach(item => {
        factorMap.set(item.trade_date, item.adj_factor);
      });

      // 5. 应用前复权计算：前复权价 = 不复权价 × (当日复权因子 / 最新复权因子)
      const adjustedData = klineData.map(item => {
        const factor = factorMap.get(item.trade_date) || latestFactor;
        const ratio = factor / latestFactor;

        return {
          ...item,
          open: item.open * ratio,
          high: item.high * ratio,
          low: item.low * ratio,
          close: item.close * ratio,
          pre_close: item.pre_close * ratio,
          change: item.change * ratio,
          // pct_chg 和 vol、amount 不需要调整
        };
      });

      return adjustedData;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch weekly kline for ${params.ts_code}: ${err.message}`);
      throw error;
    }
  }

  /**
   * 获取股票基本面数据（市值、流通市值等）
   */
  async getDailyBasic(params: {
    ts_code?: string;
    trade_date?: string; // YYYYMMDD
  }): Promise<any[]> {
    try {
      const response = await this.client.post('', {
        api_name: 'daily_basic',
        token: this.token,
        params,
        fields: 'ts_code,trade_date,total_mv,circ_mv,turnover_rate',
      });

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const items = response.data.data.items || [];
      const fields = response.data.data.fields || [];

      return items.map((item: any[]) => {
        const obj: any = {};
        fields.forEach((field: string, index: number) => {
          obj[field] = item[index];
        });
        return obj;
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch daily basic: ${err.message}`);
      throw error;
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.token;
  }
}
