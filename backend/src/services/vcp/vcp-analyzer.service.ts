import { Injectable, Logger } from '@nestjs/common';

export interface KLineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  index: number;
  date: string;
  price: number;
}

export interface ContractionResult {
  index: number;
  swingHighDate: string;
  swingHighPrice: number;
  swingLowDate: string;
  swingLowPrice: number;
  depthPct: number;
  durationDays: number;
  avgVolume: number;
}

export interface PullbackResult {
  index: number;
  highDate: string;
  highPrice: number;
  lowDate: string;
  lowPrice: number;
  pullbackPct: number;
  durationDays: number;
  avgVolume: number;
  isInUptrend: boolean;
}

export interface VcpAnalysisResult {
  hasVcp: boolean;
  contractions: ContractionResult[];
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
  pullbacks?: PullbackResult[];
}

@Injectable()
export class VcpAnalyzerService {
  private readonly logger = new Logger(VcpAnalyzerService.name);
  
  private readonly LOOKBACK = 5;
  private readonly MIN_CONTRACTION_DEPTH = 5;
  private readonly MAX_FIRST_CONTRACTION_DEPTH = 35;
  private readonly MIN_PIVOT_GAP = 3;
  private readonly DETECTION_WINDOW = 126;
  
  // 回调检测参数（更灵活）
  private readonly PULLBACK_LOOKBACK = 3;
  private readonly MIN_PULLBACK_DEPTH = 3;
  private readonly PULLBACK_WINDOW = 90;

  analyze(klines: KLineBar[]): VcpAnalysisResult {
    const window = klines.slice(-this.DETECTION_WINDOW);
    if (window.length < 30) {
      return { hasVcp: false, contractions: [], contractionCount: 0, lastContractionPct: 0, volumeDryingUp: false };
    }

    const swingHighs = this.findSwingHighs(window);
    const swingLows = this.findSwingLows(window);
    const contractions = this.extractContractions(swingHighs, swingLows, window);
    const filtered = contractions.filter(c => c.depthPct >= this.MIN_CONTRACTION_DEPTH);
    
    // 检测上涨趋势中的回调
    const pullbacks = this.findPullbacksInUptrend(klines);
    
    if (filtered.length < 2) {
      return { 
        hasVcp: false, 
        contractions: filtered, 
        contractionCount: filtered.length, 
        lastContractionPct: filtered.length > 0 ? filtered[filtered.length - 1].depthPct : 0, 
        volumeDryingUp: false,
        pullbacks,
      };
    }

    const isValid = this.validateVCP(filtered);
    const volumeDryingUp = this.detectVolumeDryingUp(filtered);
    const lastPct = filtered[filtered.length - 1].depthPct;

    return {
      hasVcp: isValid,
      contractions: filtered.map((c, i) => ({ ...c, index: i + 1 })),
      contractionCount: filtered.length,
      lastContractionPct: Math.round(lastPct * 100) / 100,
      volumeDryingUp,
      pullbacks,
    };
  }

  findSwingHighs(bars: KLineBar[]): SwingPoint[] {
    const points: SwingPoint[] = [];
    for (let i = this.LOOKBACK; i < bars.length - this.LOOKBACK; i++) {
      const windowHighs = bars.slice(i - this.LOOKBACK, i + this.LOOKBACK + 1).map(b => b.high);
      if (bars[i].high === Math.max(...windowHighs)) {
        if (points.length === 0 || i - points[points.length - 1].index >= this.MIN_PIVOT_GAP) {
          points.push({ index: i, date: bars[i].date, price: bars[i].high });
        }
      }
    }
    return points;
  }

  findSwingLows(bars: KLineBar[]): SwingPoint[] {
    const points: SwingPoint[] = [];
    for (let i = this.LOOKBACK; i < bars.length - this.LOOKBACK; i++) {
      const windowLows = bars.slice(i - this.LOOKBACK, i + this.LOOKBACK + 1).map(b => b.low);
      if (bars[i].low === Math.min(...windowLows)) {
        if (points.length === 0 || i - points[points.length - 1].index >= this.MIN_PIVOT_GAP) {
          points.push({ index: i, date: bars[i].date, price: bars[i].low });
        }
      }
    }
    return points;
  }

  extractContractions(highs: SwingPoint[], lows: SwingPoint[], bars: KLineBar[]): ContractionResult[] {
    const contractions: ContractionResult[] = [];
    
    for (const high of highs) {
      const matchingLow = lows.find(low => low.index > high.index && (lows.find(nextLow => nextLow.index > high.index) === low));
      if (!matchingLow) continue;
      
      const nextLow = lows
        .filter(l => l.index > high.index)
        .sort((a, b) => a.index - b.index)[0];
      
      if (!nextLow) continue;

      const depthPct = ((high.price - nextLow.price) / high.price) * 100;
      const durationDays = nextLow.index - high.index;
      
      const contractionBars = bars.slice(high.index, nextLow.index + 1);
      const avgVolume = contractionBars.length > 0
        ? contractionBars.reduce((sum, b) => sum + b.volume, 0) / contractionBars.length
        : 0;

      contractions.push({
        index: contractions.length + 1,
        swingHighDate: high.date,
        swingHighPrice: high.price,
        swingLowDate: nextLow.date,
        swingLowPrice: nextLow.price,
        depthPct: Math.round(depthPct * 100) / 100,
        durationDays,
        avgVolume: Math.round(avgVolume),
      });
    }

    return contractions;
  }

  validateVCP(contractions: ContractionResult[]): boolean {
    if (contractions.length < 2) return false;
    if (contractions[0].depthPct > this.MAX_FIRST_CONTRACTION_DEPTH) return false;

    for (let i = 1; i < contractions.length; i++) {
      if (contractions[i].depthPct >= contractions[i - 1].depthPct) {
        return false;
      }
    }

    return true;
  }

  detectVolumeDryingUp(contractions: ContractionResult[]): boolean {
    if (contractions.length < 2) return false;

    for (let i = 1; i < contractions.length; i++) {
      if (contractions[i].avgVolume >= contractions[i - 1].avgVolume) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检测上涨趋势中的回调
   * 使用更灵活的参数，可以捕捉小回调
   */
  findPullbacksInUptrend(klines: KLineBar[]): PullbackResult[] {
    const window = klines.slice(-this.PULLBACK_WINDOW);
    if (window.length < 20) return [];

    // 使用更短的lookback寻找局部高低点
    const localHighs = this.findLocalHighs(window, this.PULLBACK_LOOKBACK);
    const localLows = this.findLocalLows(window, this.PULLBACK_LOOKBACK);

    const pullbacks: PullbackResult[] = [];
    
    // 判断是否在上涨趋势中
    const isInUptrend = this.detectUptrend(window);

    for (const high of localHighs) {
      // 找到高点后的第一个低点
      const nextLow = localLows.find(low => low.index > high.index);
      if (!nextLow) continue;

      // 确保这个低点之后价格又上涨了（形成回调而不是下跌）
      const hasRecovery = this.checkRecovery(window, nextLow.index, high.price);

      const pullbackPct = ((high.price - nextLow.price) / high.price) * 100;
      
      // 过滤：回调深度要合理（3%-30%），在上涨趋势中可以不要求完全恢复
      if (pullbackPct >= this.MIN_PULLBACK_DEPTH && pullbackPct <= 30) {
        const durationDays = nextLow.index - high.index;
        const pullbackBars = window.slice(high.index, nextLow.index + 1);
        const avgVolume = pullbackBars.length > 0
          ? pullbackBars.reduce((sum, b) => sum + b.volume, 0) / pullbackBars.length
          : 0;

        pullbacks.push({
          index: pullbacks.length + 1,
          highDate: high.date,
          highPrice: high.price,
          lowDate: nextLow.date,
          lowPrice: nextLow.price,
          pullbackPct: Math.round(pullbackPct * 100) / 100,
          durationDays,
          avgVolume: Math.round(avgVolume),
          isInUptrend,
        });
      }
    }

    return pullbacks;
  }

  /**
   * 找局部高点（使用更短的lookback）
   */
  private findLocalHighs(bars: KLineBar[], lookback: number): SwingPoint[] {
    const points: SwingPoint[] = [];
    
    // 允许检查到最后lookback个点（部分确认）
    for (let i = lookback; i < bars.length; i++) {
      const startIdx = Math.max(0, i - lookback);
      const endIdx = Math.min(bars.length, i + lookback + 1);
      const windowHighs = bars.slice(startIdx, endIdx).map(b => b.high);
      
      if (bars[i].high === Math.max(...windowHighs)) {
        points.push({ index: i, date: bars[i].date, price: bars[i].high });
      }
    }
    
    return points;
  }

  /**
   * 找局部低点（使用更短的lookback）
   */
  private findLocalLows(bars: KLineBar[], lookback: number): SwingPoint[] {
    const points: SwingPoint[] = [];
    
    for (let i = lookback; i < bars.length; i++) {
      const startIdx = Math.max(0, i - lookback);
      const endIdx = Math.min(bars.length, i + lookback + 1);
      const windowLows = bars.slice(startIdx, endIdx).map(b => b.low);
      
      if (bars[i].low === Math.min(...windowLows)) {
        points.push({ index: i, date: bars[i].date, price: bars[i].low });
      }
    }
    
    return points;
  }

  /**
   * 检测是否在上涨趋势中
   */
  private detectUptrend(bars: KLineBar[]): boolean {
    if (bars.length < 20) return false;
    
    const recentBars = bars.slice(-30);
    const firstPrice = recentBars[0].close;
    const lastPrice = recentBars[recentBars.length - 1].close;
    
    // 最近30天价格上涨超过5%，或者整个窗口上涨超过20%
    const recentGain = (lastPrice - firstPrice) / firstPrice;
    
    if (recentGain > 0.05) return true;
    
    // 或者检查整个窗口
    const windowFirstPrice = bars[0].close;
    const windowLastPrice = bars[bars.length - 1].close;
    const windowGain = (windowLastPrice - windowFirstPrice) / windowFirstPrice;
    
    return windowGain > 0.2;
  }

  /**
   * 检查回调后是否有恢复迹象
   */
  private checkRecovery(bars: KLineBar[], lowIndex: number, previousHigh: number): boolean {
    // 检查低点之后的5天内，价格是否有所恢复
    const afterLow = bars.slice(lowIndex + 1, Math.min(lowIndex + 6, bars.length));
    if (afterLow.length < 2) return false;
    
    const lowPrice = bars[lowIndex].low;
    const maxAfterLow = Math.max(...afterLow.map(b => b.high));
    
    // 恢复幅度至少是回调的30%，或者已经接近前高
    const recoveryPct = (maxAfterLow - lowPrice) / lowPrice;
    const nearPreviousHigh = maxAfterLow >= previousHigh * 0.95;
    
    return recoveryPct > 0.03 || nearPreviousHigh;
  }
}
