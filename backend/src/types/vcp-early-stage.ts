/**
 * VCP Early Stage Filter Types
 * VCP早期启动阶段股票筛选类型定义
 * 
 * Version: 1.0.0
 * Date: 2026-03-11
 */

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * 筛选条件
 */
export interface FilterConditions {
  /** 距52周低点阈值（%），筛选 <= 此值的股票，范围20-60 */
  distFrom52WeekLow: number;
  
  /** 距52周高点阈值（%），筛选 <= 此值的股票（接近高点），范围10-50 */
  distFrom52WeekHigh: number;
  
  /** 最小收缩次数，范围2-8 */
  contractionCountMin: number;
  
  /** 最大收缩次数，范围2-8 */
  contractionCountMax: number;
}

/**
 * 筛选结果
 */
export interface FilterResult {
  /** 筛选出的股票列表 */
  stocks: EarlyStageStock[];
  
  /** 总数量 */
  total: number;
  
  /** 实际应用的筛选条件 */
  appliedConditions: FilterConditions;
  
  /** 智能提示（可选） */
  tip?: ResultTip;
}

// ============================================================================
// Domain Types
// ============================================================================

/**
 * 早期阶段股票
 */
export interface EarlyStageStock {
  /** 股票代码 */
  stockCode: string;
  
  /** 股票名称 */
  stockName: string;
  
  /** 最新价格 */
  latestPrice: number;
  
  /** 涨跌幅% */
  priceChangePct: number;
  
  /** 距52周高点% */
  distFrom52WeekHigh: number;
  
  /** 距52周低点% */
  distFrom52WeekLow: number;
  
  /** 收缩次数 */
  contractionCount: number;
  
  /** 最后收缩幅度% */
  lastContractionPct: number;
  
  /** RS评分（0-100） */
  rsRating: number;
  
  /** 成交量是否萎缩 */
  volumeDryingUp: boolean;
  
  /** VCP阶段 */
  vcpStage: VcpStage;
  
  /** 回调信息（如果存在） */
  pullbackInfo?: PullbackInfo;
}

/**
 * VCP阶段枚举
 */
export enum VcpStage {
  /** 收缩中 */
  CONTRACTION = 'contraction',
  
  /** 回调中 */
  IN_PULLBACK = 'in_pullback',
  
  /** 回调结束 */
  PULLBACK_ENDED = 'pullback_ended',
}

/**
 * 回调信息
 */
export interface PullbackInfo {
  /** 回调持续天数 */
  durationDays: number;
  
  /** 回调幅度% */
  pullbackPct: number;
  
  /** 回调前高点价格 */
  highPrice: number;
  
  /** 回调低点价格 */
  lowPrice: number;
  
  /** 回调前高点日期 */
  highDate: string;
  
  /** 回调低点日期 */
  lowDate: string;
  
  /** 距离回调低点天数 */
  daysSinceLow: number;
  
  /** 从低点反弹% */
  recoveryPct: number;
}

/**
 * 智能提示
 */
export interface ResultTip {
  /** 提示类型 */
  type: 'warning' | 'info' | 'error';
  
  /** 提示消息 */
  message: string;
  
  /** 建议的快捷操作 */
  suggestedActions: QuickAction[];
}

/**
 * 快捷操作
 */
export interface QuickAction {
  /** 操作标签（如"放宽5%"） */
  label: string;
  
  /** 调整后的条件（部分更新） */
  adjustments: Partial<FilterConditions>;
}

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * 验证规则常量
 */
export const VALIDATION_RULES = {
  distFrom52WeekLow: {
    min: 20,
    max: 60,
  },
  distFrom52WeekHigh: {
    min: 10,
    max: 50,
  },
  contractionCountMin: {
    min: 2,
    max: 8,
  },
  contractionCountMax: {
    min: 2,
    max: 8,
  },
} as const;

/**
 * 默认筛选条件
 * 
 * 注意：VCP形态的特点是股票在接近高点时进行波动性收缩
 * 因此距52周高点通常较小（多数<10%），这是强势股的表现
 */
export const DEFAULT_FILTER_CONDITIONS: FilterConditions = {
  distFrom52WeekLow: 50,   // 提高到50%以包含更多早期股票
  distFrom52WeekHigh: 10,  // 从30%降低到10%，符合VCP股票的实际特征
  contractionCountMin: 3,
  contractionCountMax: 4,
};
