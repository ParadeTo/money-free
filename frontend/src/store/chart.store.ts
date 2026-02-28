import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Period = 'daily' | 'weekly';
export type IndicatorType = 'ma' | 'kdj' | 'rsi' | 'volume' | 'amount';
export type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'vertical' | 'rect';
export type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'ALL';
export type SubChartIndicator = 'rsi' | 'kdj' | 'none';
export type VolumeChartIndicator = 'volume' | 'amount' | 'none';

interface ChartState {
  stockCode: string;
  period: Period;
  timeRange: TimeRange;
  selectedIndicators: IndicatorType[];
  showMA: boolean;
  subChart1Indicator: SubChartIndicator;
  subChart2Indicator: VolumeChartIndicator;
  activeTool: DrawingTool;
  
  // Actions
  setStockCode: (code: string) => void;
  setPeriod: (period: Period) => void;
  setTimeRange: (range: TimeRange) => void;
  setSelectedIndicators: (indicators: IndicatorType[]) => void;
  toggleIndicator: (indicator: IndicatorType) => void;
  setShowMA: (show: boolean) => void;
  setSubChart1Indicator: (indicator: SubChartIndicator) => void;
  setSubChart2Indicator: (indicator: VolumeChartIndicator) => void;
  setActiveTool: (tool: DrawingTool) => void;
  reset: () => void;
}

const initialState = {
  stockCode: '',
  period: 'daily' as Period,
  timeRange: '1Y' as TimeRange,
  selectedIndicators: ['ma', 'rsi', 'volume'] as IndicatorType[],
  showMA: true,
  subChart1Indicator: 'rsi' as SubChartIndicator,
  subChart2Indicator: 'volume' as VolumeChartIndicator,
  activeTool: 'none' as DrawingTool,
};

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      ...initialState,

      setStockCode: (code) => set({ stockCode: code }),

      setPeriod: (period) => set({ period }),

      setTimeRange: (range) => set({ timeRange: range }),

      setSelectedIndicators: (indicators) => set({ selectedIndicators: indicators }),

      toggleIndicator: (indicator) =>
        set((state) => ({
          selectedIndicators: state.selectedIndicators.includes(indicator)
            ? state.selectedIndicators.filter((i) => i !== indicator)
            : [...state.selectedIndicators, indicator],
        })),

      setShowMA: (show) => set({ showMA: show }),

      setSubChart1Indicator: (indicator) => set({ subChart1Indicator: indicator }),

      setSubChart2Indicator: (indicator) => set({ subChart2Indicator: indicator }),

      setActiveTool: (tool) => set({ activeTool: tool }),

      reset: () => set(initialState),
    }),
    {
      name: 'chart-storage',
      partialize: (state) => ({
        period: state.period,
        timeRange: state.timeRange,
        selectedIndicators: state.selectedIndicators,
        showMA: state.showMA,
        subChart1Indicator: state.subChart1Indicator,
        subChart2Indicator: state.subChart2Indicator,
      }),
    }
  )
);
