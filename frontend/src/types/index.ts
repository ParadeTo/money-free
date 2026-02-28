/**
 * API 响应类型定义
 * 基于 contracts/api-spec.md
 */

// ============================================================================
// 通用类型
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  errors?: Array<{
    field: string;
    constraints: Record<string, string>;
  }>;
}

// ============================================================================
// 认证相关
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface User {
  userId: string;
  username: string;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  defaultPeriod?: 'daily' | 'weekly';
  defaultIndicators?: string[];
}

// ============================================================================
// 股票相关
// ============================================================================

export interface Stock {
  stockCode: string;
  stockName: string;
  market: 'SH' | 'SZ';
  industry?: string;
  listDate: string;
  marketCap?: number;
  avgTurnover?: number;
  admissionStatus: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface StockQueryParams {
  page?: number;
  limit?: number;
  market?: 'SH' | 'SZ';
  admissionStatus?: 'active' | 'inactive';
  industry?: string;
  search?: string;
}

// ============================================================================
// K线数据
// ============================================================================

export interface KLineData {
  id: number;
  stockCode: string;
  date: string;
  period: 'daily' | 'weekly';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  source: 'tushare' | 'akshare';
  createdAt: string;
}

export interface KLineQueryParams {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly';
  limit?: number;
}

// ============================================================================
// 技术指标
// ============================================================================

export interface TechnicalIndicator {
  id: number;
  stockCode: string;
  date: string;
  period: 'daily' | 'weekly';
  indicatorType: 'ma' | 'kdj' | 'rsi' | 'volume' | 'amount' | 'week52_marker';
  values: any; // JSON 对象
  calculatedAt: string;
}

export interface MAValues {
  ma50?: number;
  ma150?: number;
  ma200?: number;
  ma10?: number;  // 周线
  ma30?: number;  // 周线
  ma40?: number;  // 周线
}

export interface KDJValues {
  k: number;
  d: number;
  j: number;
}

export interface RSIValues {
  value: number;
}

export interface VolumeValues {
  volume: number;
  ma52w: number;
}

export interface AmountValues {
  amount: number;
  ma52w: number;
}

export interface Week52MarkerValues {
  high: number;
  low: number;
  highDate: string;
  lowDate: string;
}

// ============================================================================
// 收藏相关
// ============================================================================

export interface Favorite {
  id: number;
  userId: string;
  stockCode: string;
  groupName?: string;
  sortOrder: number;
  createdAt: string;
  stock?: Stock;
}

export interface AddFavoriteRequest {
  stockCode: string;
  groupName?: string;
}

// ============================================================================
// 选股策略
// ============================================================================

export interface ScreenerStrategy {
  strategyId: string;
  userId: string;
  strategyName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  conditions: FilterCondition[];
}

export interface FilterCondition {
  id: number;
  strategyId: string;
  conditionType: 'indicator_value' | 'pattern' | 'price_change' | 'volume_change' | 'week_52_high' | 'week_52_low';
  indicatorName?: string;
  operator?: '>' | '<' | '>=' | '<=' | '=';
  targetValue?: number;
  pattern?: string;
  sortOrder: number;
}

export interface CreateStrategyRequest {
  strategyName: string;
  description?: string;
  conditions: Omit<FilterCondition, 'id' | 'strategyId'>[];
}

export interface ScreenerResult {
  stocks: Stock[];
  count: number;
}

// ============================================================================
// 绘图相关
// ============================================================================

export interface Drawing {
  drawingId: string;
  userId: string;
  stockCode: string;
  period: 'daily' | 'weekly';
  drawingType: 'trend_line' | 'horizontal_line' | 'vertical_line' | 'rectangle';
  coordinates: any; // JSON 对象
  stylePreset: string;
  createdAt: string;
}

export interface CreateDrawingRequest {
  stockCode: string;
  period: 'daily' | 'weekly';
  drawingType: 'trend_line' | 'horizontal_line' | 'vertical_line' | 'rectangle';
  coordinates: any;
}

// ============================================================================
// 数据更新
// ============================================================================

export interface UpdateLog {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalStocks: number;
  processedStocks: number;
  successCount: number;
  failedCount: number;
  errorDetails?: Array<{
    stockCode: string;
    errorReason: string;
    retryResult?: string;
  }>;
  startTime: string;
  endTime?: string;
}

export interface TriggerUpdateResponse {
  taskId: string;
  status: string;
  message: string;
}
