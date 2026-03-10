import { Injectable, Logger } from '@nestjs/common';
import { SMA, RSI, StochasticRSI } from 'technicalindicators';

export interface PriceData {
  date: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
}

export interface MAResult {
  date: Date | string;
  ma50?: number;
  ma150?: number;
  ma200?: number;
  ma10?: number;
  ma30?: number;
  ma40?: number;
  [key: string]: Date | string | number | undefined;
}

export interface KDJResult {
  date: Date | string;
  k: number;
  d: number;
  j: number;
}

export interface RSIResult {
  date: Date | string;
  rsi: number;
}

export interface VolumeResult {
  date: Date | string;
  volume: number;
  volumeMA: number;
}

export interface AmountResult {
  date: Date | string;
  amount: number;
  amountMA: number;
}

@Injectable()
export class TechnicalIndicatorsService {
  private readonly logger = new Logger(TechnicalIndicatorsService.name);

  /**
   * 计算移动平均线（MA）
   */
  calculateMA(
    data: PriceData[],
    periods: { daily?: number[]; weekly?: number[] },
    period: 'daily' | 'weekly',
  ): MAResult[] {
    const closePrices = data.map((d) => d.close);
    const targetPeriods = period === 'daily' ? periods.daily || [50, 150, 200] : periods.weekly || [10, 30, 40];

    const results: MAResult[] = [];

    // 计算每个周期的 MA
    const maValues: { [key: number]: number[] } = {};
    targetPeriods.forEach((p) => {
      maValues[p] = SMA.calculate({ period: p, values: closePrices });
    });

    // 合并结果
    data.forEach((item, index) => {
      const result: MAResult = { date: item.date };
      
      targetPeriods.forEach((p) => {
        const maArray = maValues[p];
        const offset = closePrices.length - maArray.length;
        if (index >= offset) {
          const key = period === 'daily' ? `ma${p}` : `ma${p}`;
          result[key] = maArray[index - offset];
        }
      });

      results.push(result);
    });

    return results;
  }

  /**
   * 计算 KDJ 指标
   * KDJ = 随机指标，用于判断超买超卖
   * RSV = (收盘价 - N日最低价) / (N日最高价 - N日最低价) * 100
   * K = 2/3 * 前一日K + 1/3 * 当日RSV
   * D = 2/3 * 前一日D + 1/3 * 当日K
   * J = 3 * 当日K - 2 * 当日D
   */
  calculateKDJ(data: PriceData[], period = 9, signalPeriod = 3): KDJResult[] {
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const closes = data.map((d) => d.close);

    const results: KDJResult[] = [];
    let prevK = 50; // 初始值为 50
    let prevD = 50; // 初始值为 50

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        // 前 period-1 天数据不足，返回初始值
        results.push({
          date: data[i].date,
          k: prevK,
          d: prevD,
          j: 3 * prevK - 2 * prevD,
        });
        continue;
      }

      // 计算 RSV
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      const currentClose = closes[i];

      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);

      let rsv = 50; // 默认值
      if (highestHigh !== lowestLow) {
        rsv = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      }

      // 计算 K、D、J（使用指数移动平均）
      const k = (2 / 3) * prevK + (1 / 3) * rsv;
      const d = (2 / 3) * prevD + (1 / 3) * k;
      const j = 3 * k - 2 * d;

      results.push({
        date: data[i].date,
        k,
        d,
        j,
      });

      // 更新前一日值
      prevK = k;
      prevD = d;
    }

    return results;
  }

  /**
   * 计算 RSI 指标
   */
  calculateRSI(data: PriceData[], period = 14): RSIResult[] {
    const closePrices = data.map((d) => d.close);
    const rsiValues = RSI.calculate({ period, values: closePrices });

    const results: RSIResult[] = [];
    const offset = closePrices.length - rsiValues.length;

    data.forEach((item, index) => {
      if (index >= offset) {
        results.push({
          date: item.date,
          rsi: rsiValues[index - offset],
        });
      } else {
        results.push({
          date: item.date,
          rsi: 0,
        });
      }
    });

    return results;
  }

  /**
   * 计算成交量及其 52 周均线
   */
  calculateVolume(data: PriceData[], period = 52): VolumeResult[] {
    const volumes = data.map((d) => d.volume);
    const volumeMA = SMA.calculate({ period, values: volumes });

    const results: VolumeResult[] = [];
    const offset = volumes.length - volumeMA.length;

    data.forEach((item, index) => {
      results.push({
        date: item.date,
        volume: item.volume,
        volumeMA: index >= offset ? volumeMA[index - offset] : 0,
      });
    });

    return results;
  }

  /**
   * 计算成交额及其 52 周均线
   */
  calculateAmount(data: PriceData[], period = 52): AmountResult[] {
    const amounts = data.map((d) => d.amount || 0);
    const amountMA = SMA.calculate({ period, values: amounts });

    const results: AmountResult[] = [];
    const offset = amounts.length - amountMA.length;

    data.forEach((item, index) => {
      results.push({
        date: item.date,
        amount: item.amount || 0,
        amountMA: index >= offset ? amountMA[index - offset] : 0,
      });
    });

    return results;
  }

  /**
   * 计算 52 周最高/最低标注
   */
  calculate52WeekMarkers(data: PriceData[]): {
    high52Week: number;
    low52Week: number;
    high52WeekDate: Date | string;
    low52WeekDate: Date | string;
  } | null {
    if (data.length === 0) {
      return null;
    }

    // 取最近 52 周（约 260 个交易日）
    const recentData = data.slice(-260);

    let highestPrice = -Infinity;
    let lowestPrice = Infinity;
    let highDate = recentData[0].date;
    let lowDate = recentData[0].date;

    recentData.forEach((item) => {
      if (item.high > highestPrice) {
        highestPrice = item.high;
        highDate = item.date;
      }
      if (item.low < lowestPrice) {
        lowestPrice = item.low;
        lowDate = item.date;
      }
    });

    return {
      high52Week: highestPrice,
      low52Week: lowestPrice,
      high52WeekDate: highDate,
      low52WeekDate: lowDate,
    };
  }
}
