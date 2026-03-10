import { VcpAnalyzerService, KLineBar } from './vcp-analyzer.service';

function makeBar(date: string, high: number, low: number, close: number, volume: number): KLineBar {
  return { date, open: close, high, low, close, volume };
}

describe('VcpAnalyzerService', () => {
  let service: VcpAnalyzerService;

  beforeEach(() => {
    service = new VcpAnalyzerService();
  });

  describe('analyze', () => {
    it('returns hasVcp=false for insufficient bars (<30)', () => {
      const bars: KLineBar[] = [];
      for (let i = 0; i < 25; i++) {
        bars.push(makeBar(`2024-01-${String(i + 1).padStart(2, '0')}`, 100, 99, 99.5, 1000));
      }
      const result = service.analyze(bars);
      expect(result.hasVcp).toBe(false);
      expect(result.contractions).toEqual([]);
      expect(result.contractionCount).toBe(0);
    });
  });

  describe('findSwingHighs', () => {
    it('detects pivot highs with lookback=5 in synthetic data', () => {
      const bars: KLineBar[] = [];
      for (let i = 0; i < 25; i++) {
        const isPivot = i === 10;
        bars.push(makeBar(`2024-01-${String(i + 1).padStart(2, '0')}`, isPivot ? 100 : 90, isPivot ? 99 : 89, isPivot ? 99.5 : 89.5, 1000));
      }
      const highs = service.findSwingHighs(bars);
      expect(highs.length).toBeGreaterThanOrEqual(1);
      expect(highs.some(h => h.price === 100)).toBe(true);
    });
  });

  describe('findSwingLows', () => {
    it('detects pivot lows with lookback=5 in synthetic data', () => {
      const bars: KLineBar[] = [];
      for (let i = 0; i < 25; i++) {
        const isPivot = i === 10;
        bars.push(makeBar(`2024-01-${String(i + 1).padStart(2, '0')}`, isPivot ? 76 : 80, isPivot ? 75 : 80, isPivot ? 75.5 : 80, 1000));
      }
      const lows = service.findSwingLows(bars);
      expect(lows.length).toBeGreaterThanOrEqual(1);
      expect(lows.some(l => l.price === 75)).toBe(true);
    });
  });

  describe('validateVCP', () => {
    it('returns true when contractions have decreasing depth', () => {
      const contractions = [
        { index: 1, swingHighDate: '', swingHighPrice: 100, swingLowDate: '', swingLowPrice: 75, depthPct: 25, durationDays: 10, avgVolume: 1000 },
        { index: 2, swingHighDate: '', swingHighPrice: 95, swingLowDate: '', swingLowPrice: 90, depthPct: 5.26, durationDays: 10, avgVolume: 800 },
      ];
      expect(service.validateVCP(contractions)).toBe(true);
    });

    it('returns false when first > 35%', () => {
      const contractions = [
        { index: 1, swingHighDate: '', swingHighPrice: 100, swingLowDate: '', swingLowPrice: 60, depthPct: 40, durationDays: 10, avgVolume: 1000 },
        { index: 2, swingHighDate: '', swingHighPrice: 95, swingLowDate: '', swingLowPrice: 90, depthPct: 5, durationDays: 10, avgVolume: 800 },
      ];
      expect(service.validateVCP(contractions)).toBe(false);
    });

    it('returns false when depths do not decrease', () => {
      const contractions = [
        { index: 1, swingHighDate: '', swingHighPrice: 100, swingLowDate: '', swingLowPrice: 85, depthPct: 15, durationDays: 10, avgVolume: 1000 },
        { index: 2, swingHighDate: '', swingHighPrice: 95, swingLowDate: '', swingLowPrice: 80, depthPct: 15.79, durationDays: 10, avgVolume: 800 },
      ];
      expect(service.validateVCP(contractions)).toBe(false);
    });
  });

  describe('detectVolumeDryingUp', () => {
    it('returns true when avg volumes decrease', () => {
      const contractions = [
        { index: 1, swingHighDate: '', swingHighPrice: 100, swingLowDate: '', swingLowPrice: 85, depthPct: 15, durationDays: 10, avgVolume: 1000 },
        { index: 2, swingHighDate: '', swingHighPrice: 95, swingLowDate: '', swingLowPrice: 90, depthPct: 5, durationDays: 10, avgVolume: 800 },
      ];
      expect(service.detectVolumeDryingUp(contractions)).toBe(true);
    });

    it('returns false when volumes do not decrease', () => {
      const contractions = [
        { index: 1, swingHighDate: '', swingHighPrice: 100, swingLowDate: '', swingLowPrice: 85, depthPct: 15, durationDays: 10, avgVolume: 800 },
        { index: 2, swingHighDate: '', swingHighPrice: 95, swingLowDate: '', swingLowPrice: 90, depthPct: 5, durationDays: 10, avgVolume: 1000 },
      ];
      expect(service.detectVolumeDryingUp(contractions)).toBe(false);
    });
  });

  describe('integration', () => {
    it('analyze returns hasVcp=true for properly constructed VCP-like kline dataset with decreasing contractions', () => {
      const bars: KLineBar[] = [];
      const baseDate = '2024-01-01';
      for (let i = 0; i < 55; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        let high = 100 - i;
        let low = 50 + i;
        let volume = 500;
        if (i === 10) {
          high = 100;
          low = 99;
          volume = 1000;
        } else if (i === 20) {
          high = 76;
          low = 75;
          volume = 1000;
        } else if (i >= 15 && i <= 25 && i !== 20) {
          low = 76;
        } else if (i === 30) {
          high = 95;
          low = 94;
          volume = 500;
        } else if (i === 40) {
          high = 90;
          low = 89;
          volume = 500;
        } else if (i >= 35 && i <= 45 && i !== 40) {
          low = 90;
        }
        bars.push(makeBar(dateStr, high, low, (high + low) / 2, volume));
      }
      const result = service.analyze(bars);
      expect(result.hasVcp).toBe(true);
      expect(result.contractionCount).toBeGreaterThanOrEqual(2);
      expect(result.contractions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
