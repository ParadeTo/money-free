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

export interface VcpAnalysisResult {
  hasVcp: boolean;
  contractions: ContractionResult[];
  contractionCount: number;
  lastContractionPct: number;
  volumeDryingUp: boolean;
}

@Injectable()
export class VcpAnalyzerService {
  private readonly logger = new Logger(VcpAnalyzerService.name);
  
  private readonly LOOKBACK = 5;
  private readonly MIN_CONTRACTION_DEPTH = 5;
  private readonly MAX_FIRST_CONTRACTION_DEPTH = 35;
  private readonly MIN_PIVOT_GAP = 3;
  private readonly DETECTION_WINDOW = 126;

  analyze(klines: KLineBar[]): VcpAnalysisResult {
    const window = klines.slice(-this.DETECTION_WINDOW);
    if (window.length < 30) {
      return { hasVcp: false, contractions: [], contractionCount: 0, lastContractionPct: 0, volumeDryingUp: false };
    }

    const swingHighs = this.findSwingHighs(window);
    const swingLows = this.findSwingLows(window);
    const contractions = this.extractContractions(swingHighs, swingLows, window);
    const filtered = contractions.filter(c => c.depthPct >= this.MIN_CONTRACTION_DEPTH);
    
    if (filtered.length < 2) {
      return { hasVcp: false, contractions: filtered, contractionCount: filtered.length, lastContractionPct: filtered.length > 0 ? filtered[filtered.length - 1].depthPct : 0, volumeDryingUp: false };
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
}
