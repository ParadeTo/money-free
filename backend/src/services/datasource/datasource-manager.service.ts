import { Injectable, Logger } from '@nestjs/common';
import { TushareService, TushareKLineData } from './tushare.service';
import { AkShareService, AkShareKLineData } from './akshare.service';

export interface KLineData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  preClose?: number;
  change?: number;
  pctChange?: number;
}

@Injectable()
export class DataSourceManagerService {
  private readonly logger = new Logger(DataSourceManagerService.name);

  constructor(
    private tushareService: TushareService,
    private akshareService: AkShareService,
  ) {}

  /**
   * 获取日线数据（自动降级）
   * 优先使用 Tushare，失败则使用 AkShare
   */
  async getDailyKLine(params: {
    stockCode: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: KLineData[]; source: 'tushare' | 'akshare' }> {
    const { stockCode, startDate, endDate } = params;

    // 转换股票代码格式
    const tsCode = this.convertToTushareCode(stockCode);
    const akSymbol = this.convertToAkShareSymbol(stockCode);

    // 转换日期格式
    const tushareStartDate = startDate ? startDate.replace(/-/g, '') : undefined;
    const tushareEndDate = endDate ? endDate.replace(/-/g, '') : undefined;

    // 尝试 Tushare
    if (this.tushareService.isAvailable()) {
      try {
        this.logger.log(`📊 Fetching daily kline for ${stockCode} from Tushare`);
        const tushareData = await this.tushareService.getDailyKLine({
          ts_code: tsCode,
          start_date: tushareStartDate,
          end_date: tushareEndDate,
        });

        const data = this.transformTushareData(tushareData);
        this.logger.log(`✅ Tushare: fetched ${data.length} daily records for ${stockCode}`);
        return { data, source: 'tushare' };
      } catch (error) {
        const err = error as Error;
        this.logger.warn(`⚠️ Tushare failed for ${stockCode}: ${err.message}, falling back to AkShare`);
      }
    }

    // 降级到 AkShare
    try {
      this.logger.log(`📊 Fetching daily kline for ${stockCode} from AkShare`);
      const akshareData = await this.akshareService.getDailyKLine({
        symbol: akSymbol,
        start_date: startDate,
        end_date: endDate,
      });

      const data = this.transformAkShareData(akshareData);
      this.logger.log(`✅ AkShare: fetched ${data.length} daily records for ${stockCode}`);
      return { data, source: 'akshare' };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Both Tushare and AkShare failed for ${stockCode}`);
      throw new Error(`Failed to fetch data from all sources: ${err.message}`);
    }
  }

  /**
   * 获取周线数据（自动降级）
   */
  async getWeeklyKLine(params: {
    stockCode: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: KLineData[]; source: 'tushare' | 'akshare' }> {
    const { stockCode, startDate, endDate } = params;

    const tsCode = this.convertToTushareCode(stockCode);
    const akSymbol = this.convertToAkShareSymbol(stockCode);

    const tushareStartDate = startDate ? startDate.replace(/-/g, '') : undefined;
    const tushareEndDate = endDate ? endDate.replace(/-/g, '') : undefined;

    // 尝试 Tushare
    if (this.tushareService.isAvailable()) {
      try {
        this.logger.log(`📊 Fetching weekly kline for ${stockCode} from Tushare`);
        const tushareData = await this.tushareService.getWeeklyKLine({
          ts_code: tsCode,
          start_date: tushareStartDate,
          end_date: tushareEndDate,
        });

        const data = this.transformTushareData(tushareData);
        this.logger.log(`✅ Tushare: fetched ${data.length} weekly records for ${stockCode}`);
        return { data, source: 'tushare' };
      } catch (error) {
        const err = error as Error;
        this.logger.warn(`⚠️ Tushare failed for ${stockCode}: ${err.message}, falling back to AkShare`);
      }
    }

    // 降级到 AkShare
    try {
      this.logger.log(`📊 Fetching weekly kline for ${stockCode} from AkShare`);
      const akshareData = await this.akshareService.getWeeklyKLine({
        symbol: akSymbol,
        start_date: startDate,
        end_date: endDate,
      });

      const data = this.transformAkShareData(akshareData);
      this.logger.log(`✅ AkShare: fetched ${data.length} weekly records for ${stockCode}`);
      return { data, source: 'akshare' };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Both Tushare and AkShare failed for ${stockCode}`);
      throw new Error(`Failed to fetch data from all sources: ${err.message}`);
    }
  }

  /**
   * 转换股票代码到 Tushare 格式
   * 例: 600519 -> 600519.SH, 000001 -> 000001.SZ
   */
  private convertToTushareCode(stockCode: string): string {
    if (stockCode.includes('.')) {
      return stockCode;
    }

    if (stockCode.startsWith('6')) {
      return `${stockCode}.SH`;
    } else if (stockCode.startsWith('0') || stockCode.startsWith('3')) {
      return `${stockCode}.SZ`;
    }

    return stockCode;
  }

  /**
   * 转换股票代码到 AkShare 格式
   * 例: 600519 -> sh600519, 000001 -> sz000001
   */
  private convertToAkShareSymbol(stockCode: string): string {
    const cleanCode = stockCode.replace(/\.(SH|SZ)$/i, '');

    if (cleanCode.startsWith('6')) {
      return `sh${cleanCode}`;
    } else if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) {
      return `sz${cleanCode}`;
    }

    return cleanCode;
  }

  /**
   * 转换 Tushare 数据格式
   */
  private transformTushareData(data: TushareKLineData[]): KLineData[] {
    return data.map((item) => ({
      date: this.parseTushareDate(item.trade_date),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.vol,
      amount: item.amount,
      preClose: item.pre_close,
      change: item.change,
      pctChange: item.pct_chg,
    }));
  }

  /**
   * 转换 AkShare 数据格式
   */
  private transformAkShareData(data: AkShareKLineData[]): KLineData[] {
    return data.map((item) => ({
      date: new Date(item.date),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      amount: item.amount,
    }));
  }

  /**
   * 解析 Tushare 日期格式 (YYYYMMDD -> Date)
   */
  private parseTushareDate(dateStr: string): Date {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }
}
