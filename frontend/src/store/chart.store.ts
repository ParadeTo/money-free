/**
 * 图表状态管理
 * 
 * 使用 Zustand 管理图表相关状态：
 * - 选中的股票代码
 * - K线周期（日K/周K）
 * - 选中的技术指标
 * - 显示选项（成交量、成交额）
 * - 绘图工具状态
 */

import { create } from 'zustand';
import type { Period, IndicatorType } from '../types/stock';
import type { DrawingType, Drawing } from '../types/drawing';

interface ChartState {
  // 当前股票
  stockCode: string | null;
  
  // K线周期
  period: Period;
  
  // 选中的指标
  selectedIndicators: IndicatorType[];
  
  // 显示选项
  showVolume: boolean;
  showTurnover: boolean;
  
  // 绘图工具
  activeTool: 'none' | DrawingType;
  drawings: Drawing[];
  
  // Actions
  setStockCode: (code: string) => void;
  setPeriod: (period: Period) => void;
  setSelectedIndicators: (indicators: IndicatorType[]) => void;
  toggleVolume: () => void;
  toggleTurnover: () => void;
  setActiveTool: (tool: 'none' | DrawingType) => void;
  setDrawings: (drawings: Drawing[]) => void;
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (drawingId: string) => void;
  reset: () => void;
}

const initialState = {
  stockCode: null,
  period: 'daily' as Period,
  selectedIndicators: ['MA50', 'MA150', 'MA200'] as IndicatorType[],
  showVolume: true,
  showTurnover: false,
  activeTool: 'none' as 'none' | DrawingType,
  drawings: [] as Drawing[],
};

export const useChartStore = create<ChartState>((set) => ({
  ...initialState,
  
  setStockCode: (code) => set({ stockCode: code }),
  
  setPeriod: (period) => 
    set(() => {
      // 切换周期时，自动切换默认MA指标
      const defaultIndicators = period === 'daily'
        ? ['MA50', 'MA150', 'MA200'] as IndicatorType[]
        : ['MA10', 'MA30', 'MA40'] as IndicatorType[];
      
      return {
        period,
        selectedIndicators: defaultIndicators,
      };
    }),
  
  setSelectedIndicators: (indicators) => 
    set({ selectedIndicators: indicators }),
  
  toggleVolume: () => 
    set((state) => ({ showVolume: !state.showVolume })),
  
  toggleTurnover: () => 
    set((state) => ({ showTurnover: !state.showTurnover })),
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  setDrawings: (drawings) => set({ drawings }),
  
  addDrawing: (drawing) => 
    set((state) => ({ drawings: [...state.drawings, drawing] })),
  
  removeDrawing: (drawingId) => 
    set((state) => ({ 
      drawings: state.drawings.filter((d) => d.id !== drawingId) 
    })),
  
  reset: () => set(initialState),
}));
