/**
 * API Contract: VCP Early Stage Filter
 * 早期启动阶段股票筛选API契约
 * 
 * Version: 1.0.0
 * Date: 2026-03-11
 */

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * POST /api/vcp/early-stage
 * 筛选早期启动阶段的VCP股票
 */
export interface FilterEarlyStageRequest {
  /** 距52周低点阈值（%），范围20-60 */
  distFrom52WeekLow: number;
  
  /** 距52周高点阈值（%），范围10-50 */
  distFrom52WeekHigh: number;
  
  /** 最小收缩次数，范围2-8 */
  contractionCountMin: number;
  
  /** 最大收缩次数，范围2-8 */
  contractionCountMax: number;
}

export interface FilterEarlyStageResponse {
  /** 筛选出的股票列表 */
  stocks: EarlyStageStock[];
  
  /** 总数量 */
  total: number;
  
  /** 实际应用的筛选条件 */
  appliedConditions: FilterEarlyStageRequest;
  
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
  adjustments: Partial<FilterEarlyStageRequest>;
}

// ============================================================================
// API Examples
// ============================================================================

/**
 * 示例请求1：使用默认条件
 */
export const exampleRequest1: FilterEarlyStageRequest = {
  distFrom52WeekLow: 40,
  distFrom52WeekHigh: 30,
  contractionCountMin: 3,
  contractionCountMax: 4,
};

/**
 * 示例响应1：成功返回7只股票
 */
export const exampleResponse1: FilterEarlyStageResponse = {
  stocks: [
    {
      stockCode: '002142',
      stockName: '宁波银行',
      latestPrice: 31.56,
      priceChangePct: 0.45,
      distFrom52WeekHigh: 4.13,
      distFrom52WeekLow: 44.44,
      contractionCount: 3,
      lastContractionPct: 6.53,
      rsRating: 74,
      volumeDryingUp: false,
      vcpStage: VcpStage.IN_PULLBACK,
      pullbackInfo: {
        durationDays: 6,
        pullbackPct: 4.73,
        highPrice: 32.58,
        lowPrice: 31.04,
        highDate: '2026-03-02',
        lowDate: '2026-03-10',
        daysSinceLow: 0,
        recoveryPct: 1.68,
      },
    },
    // ... 更多股票
  ],
  total: 7,
  appliedConditions: exampleRequest1,
  tip: {
    type: 'warning',
    message: '当前条件筛选出7只股票，建议放宽筛选条件',
    suggestedActions: [
      {
        label: '放宽5%',
        adjustments: { distFrom52WeekLow: 45 },
      },
      {
        label: '放宽10%',
        adjustments: { distFrom52WeekLow: 50 },
      },
    ],
  },
};

/**
 * 示例请求2：放宽条件
 */
export const exampleRequest2: FilterEarlyStageRequest = {
  distFrom52WeekLow: 50,
  distFrom52WeekHigh: 25,
  contractionCountMin: 2,
  contractionCountMax: 5,
};

/**
 * 示例响应2：返回45只股票（过多）
 */
export const exampleResponse2: FilterEarlyStageResponse = {
  stocks: [
    // ... 45只股票
  ],
  total: 45,
  appliedConditions: exampleRequest2,
  tip: {
    type: 'info',
    message: '当前条件筛选出45只股票，建议收紧筛选条件以聚焦优质标的',
    suggestedActions: [
      {
        label: '收紧5%',
        adjustments: { distFrom52WeekLow: 45 },
      },
      {
        label: '收紧10%',
        adjustments: { distFrom52WeekLow: 40 },
      },
    ],
  },
};

/**
 * 示例响应3：未找到股票
 */
export const exampleResponse3: FilterEarlyStageResponse = {
  stocks: [],
  total: 0,
  appliedConditions: {
    distFrom52WeekLow: 20,
    distFrom52WeekHigh: 40,
    contractionCountMin: 2,
    contractionCountMax: 3,
  },
  tip: {
    type: 'error',
    message: '未找到符合条件的股票，建议放宽筛选条件',
    suggestedActions: [
      {
        label: '放宽5%',
        adjustments: { distFrom52WeekLow: 25 },
      },
      {
        label: '使用推荐设置',
        adjustments: {
          distFrom52WeekLow: 40,
          distFrom52WeekHigh: 30,
          contractionCountMin: 3,
          contractionCountMax: 4,
        },
      },
    ],
  },
};

// ============================================================================
// Error Responses
// ============================================================================

/**
 * 验证错误响应
 */
export interface ValidationErrorResponse {
  statusCode: 400;
  message: string[];
  error: 'Bad Request';
}

/**
 * 示例错误：参数超出范围
 */
export const exampleValidationError: ValidationErrorResponse = {
  statusCode: 400,
  message: [
    'distFrom52WeekLow必须在20-60之间',
    'contractionCountMin不能大于contractionCountMax',
  ],
  error: 'Bad Request',
};

/**
 * 服务器错误响应
 */
export interface ServerErrorResponse {
  statusCode: 500;
  message: string;
  error: 'Internal Server Error';
}

/**
 * 示例错误：数据库查询失败
 */
export const exampleServerError: ServerErrorResponse = {
  statusCode: 500,
  message: '筛选服务暂时不可用，请稍后重试',
  error: 'Internal Server Error',
};

// ============================================================================
// Validation Rules (for documentation)
// ============================================================================

/**
 * 请求验证规则
 */
export const ValidationRules = {
  distFrom52WeekLow: {
    min: 20,
    max: 60,
    type: 'number',
    description: '距52周低点阈值必须在20-60之间',
  },
  distFrom52WeekHigh: {
    min: 10,
    max: 50,
    type: 'number',
    description: '距52周高点阈值必须在10-50之间',
  },
  contractionCountMin: {
    min: 2,
    max: 8,
    type: 'integer',
    description: '最小收缩次数必须在2-8之间',
  },
  contractionCountMax: {
    min: 2,
    max: 8,
    type: 'integer',
    description: '最大收缩次数必须在2-8之间',
    constraint: 'Must be >= contractionCountMin',
  },
} as const;

// ============================================================================
// Sorting Rules (for documentation)
// ============================================================================

/**
 * 结果排序规则
 * 
 * 1. 首先按vcpStage排序：
 *    - contraction (收缩中) 排在最前
 *    - in_pullback (回调中) 次之
 *    - pullback_ended (回调结束) 最后
 * 
 * 2. 同一vcpStage内按distFrom52WeekLow升序排序
 *    （距52周低点越近的排越前）
 */
export const SortingRules = {
  primary: 'vcpStage',
  primaryOrder: ['contraction', 'in_pullback', 'pullback_ended'],
  secondary: 'distFrom52WeekLow',
  secondaryOrder: 'asc',
} as const;
