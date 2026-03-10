/**
 * StockHub - 类型定义
 * 
 * 基于 contracts/rest-api.md 的 TypeScript 接口定义
 */

/**
 * 股票基本信息
 */
export interface Stock {
  stock_code: string;
  stock_name: string;
  market: "SH" | "SZ";
  industry: string | null;
  list_date: string;  // YYYY-MM-DD
  market_cap: number;  // 亿元
  avg_turnover: number;  // 万元
  status: "active" | "inactive";
  latest_price?: number;
  price_change?: number;
  price_change_percent?: number;
}

/**
 * K线数据
 */
export interface KLineData {
  date: string;  // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

/**
 * K线数据响应
 */
export interface KLineResponse {
  stock_code: string;
  period: "daily" | "weekly";
  data: KLineData[];
  count: number;
}

/**
 * 技术指标数据点
 */
export interface IndicatorData {
  date: string;
  value: number | null;
}

/**
 * 技术指标值集合（用于图表渲染）
 */
export interface IndicatorValues {
  MA50?: IndicatorData[];
  MA150?: IndicatorData[];
  MA200?: IndicatorData[];
  MA10?: IndicatorData[];
  MA30?: IndicatorData[];
  MA40?: IndicatorData[];
  KDJ_K?: IndicatorData[];
  KDJ_D?: IndicatorData[];
  KDJ_J?: IndicatorData[];
  RSI?: IndicatorData[];
  volume_ma52w?: IndicatorData[];
  turnover_ma52w?: IndicatorData[];
  high_52w?: IndicatorData[];
  low_52w?: IndicatorData[];
}

/**
 * 技术指标响应
 */
export interface IndicatorsResponse {
  stock_code: string;
  period: "daily" | "weekly";
  indicators: {
    [indicatorType: string]: IndicatorData[];
  };
  count: number;
}

/**
 * 52周高低点标记
 */
export interface Week52Markers {
  stock_code: string;
  high_52w: {
    date: string;
    value: number;
    label: string;
  };
  low_52w: {
    date: string;
    value: number;
    label: string;
  };
  current_price: number;
  current_date: string;
}

/**
 * 股票搜索响应
 */
export interface StockSearchResponse {
  results: Stock[];
  total: number;
}

/**
 * 股票列表响应
 */
export interface StockListResponse {
  stocks: Stock[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * K线周期类型
 */
export type Period = "daily" | "weekly";

/**
 * 技术指标类型
 */
export type IndicatorType = 
  | "MA50" | "MA150" | "MA200" 
  | "MA10" | "MA30" | "MA40"
  | "KDJ_K" | "KDJ_D" | "KDJ_J"
  | "RSI"
  | "volume_ma52w" | "turnover_ma52w"
  | "high_52w" | "low_52w";

/**
 * 图表配置（用于前端状态管理）
 */
export interface ChartConfig {
  period: Period;
  selectedIndicators: IndicatorType[];
  showVolume: boolean;
  showTurnover: boolean;
}
