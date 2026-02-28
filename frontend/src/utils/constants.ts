/**
 * 应用常量配置
 */

// ============================================================================
// API 端点
// ============================================================================

export const API_ENDPOINTS = {
  // 认证
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },

  // 股票
  STOCKS: {
    LIST: '/stocks',
    DETAIL: (stockCode: string) => `/stocks/${stockCode}`,
  },

  // K线数据
  KLINE: {
    LIST: (stockCode: string) => `/stocks/${stockCode}/kline`,
  },

  // 技术指标
  INDICATORS: {
    LIST: (stockCode: string) => `/stocks/${stockCode}/indicators`,
    BY_TYPE: (stockCode: string, type: string) => `/stocks/${stockCode}/indicators/${type}`,
  },

  // 收藏
  FAVORITES: {
    LIST: '/favorites',
    ADD: '/favorites',
    REMOVE: (favoriteId: number) => `/favorites/${favoriteId}`,
    GROUPS: '/favorites/groups',
    BY_GROUP: (groupName: string) => `/favorites/groups/${groupName}`,
  },

  // 选股策略
  SCREENER: {
    STRATEGIES: '/screener/strategies',
    DETAIL: (strategyId: string) => `/screener/strategies/${strategyId}`,
    EXECUTE: (strategyId: string) => `/screener/strategies/${strategyId}/execute`,
  },

  // 绘图
  DRAWINGS: {
    LIST: (stockCode: string) => `/drawings/${stockCode}`,
    CREATE: '/drawings',
    DELETE: (drawingId: string) => `/drawings/${drawingId}`,
  },

  // 数据更新
  DATA_UPDATE: {
    TRIGGER: '/data-update/trigger',
    STATUS: (taskId: string) => `/data-update/status/${taskId}`,
    LOGS: '/data-update/logs',
  },

  // 健康检查
  HEALTH: {
    CHECK: '/health',
    DB: '/health/db',
  },
};

// ============================================================================
// 应用配置
// ============================================================================

export const APP_CONFIG = {
  NAME: '股票分析工具',
  VERSION: '1.0.0',
  DESCRIPTION: 'A股技术分析平台',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// ============================================================================
// 股票市场
// ============================================================================

export const MARKETS = {
  SH: { value: 'SH', label: '上海证券交易所' },
  SZ: { value: 'SZ', label: '深圳证券交易所' },
} as const;

export const MARKET_OPTIONS = Object.values(MARKETS);

// ============================================================================
// K线周期
// ============================================================================

export const PERIODS = {
  DAILY: { value: 'daily', label: '日线' },
  WEEKLY: { value: 'weekly', label: '周线' },
} as const;

export const PERIOD_OPTIONS = Object.values(PERIODS);

// ============================================================================
// 技术指标
// ============================================================================

export const INDICATOR_TYPES = {
  MA: { value: 'ma', label: '均线 (MA)' },
  KDJ: { value: 'kdj', label: '随机指标 (KDJ)' },
  RSI: { value: 'rsi', label: '相对强弱指标 (RSI)' },
  VOLUME: { value: 'volume', label: '成交量' },
  AMOUNT: { value: 'amount', label: '成交额' },
  WEEK52_MARKER: { value: 'week52_marker', label: '52周标注' },
} as const;

export const INDICATOR_OPTIONS = Object.values(INDICATOR_TYPES);

// MA 参数配置
export const MA_PERIODS = {
  DAILY: [50, 150, 200],
  WEEKLY: [10, 30, 40],
};

// KDJ 参数配置
export const KDJ_PARAMS = {
  PERIOD: 9,
  K_PERIOD: 3,
  D_PERIOD: 3,
};

// RSI 参数配置
export const RSI_PERIOD = 14;

// ============================================================================
// 选股条件
// ============================================================================

export const CONDITION_TYPES = {
  INDICATOR_VALUE: { value: 'indicator_value', label: '指标数值' },
  PATTERN: { value: 'pattern', label: '形态识别' },
  PRICE_CHANGE: { value: 'price_change', label: '价格变化' },
  VOLUME_CHANGE: { value: 'volume_change', label: '成交量变化' },
  WEEK_52_HIGH: { value: 'week_52_high', label: '52周新高' },
  WEEK_52_LOW: { value: 'week_52_low', label: '52周新低' },
} as const;

export const CONDITION_TYPE_OPTIONS = Object.values(CONDITION_TYPES);

export const OPERATORS = [
  { value: '>', label: '大于 (>)' },
  { value: '<', label: '小于 (<)' },
  { value: '>=', label: '大于等于 (>=)' },
  { value: '<=', label: '小于等于 (<=)' },
  { value: '=', label: '等于 (=)' },
];

export const PATTERNS = [
  { value: 'kdj_golden_cross', label: 'KDJ 金叉' },
  { value: 'kdj_death_cross', label: 'KDJ 死叉' },
  { value: 'price_above_ma', label: '价格站上均线' },
  { value: 'price_below_ma', label: '价格跌破均线' },
];

// ============================================================================
// 绘图类型
// ============================================================================

export const DRAWING_TYPES = {
  TREND_LINE: { value: 'trend_line', label: '趋势线' },
  HORIZONTAL_LINE: { value: 'horizontal_line', label: '水平线' },
  VERTICAL_LINE: { value: 'vertical_line', label: '垂直线' },
  RECTANGLE: { value: 'rectangle', label: '矩形' },
} as const;

export const DRAWING_TYPE_OPTIONS = Object.values(DRAWING_TYPES);

// ============================================================================
// 本地存储键
// ============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'access_token',
  USER_INFO: 'user_info',
  THEME: 'theme_mode',
  RECENT_STOCKS: 'recent_stocks',
  FAVORITE_GROUPS: 'favorite_groups',
} as const;

// ============================================================================
// 日期格式
// ============================================================================

export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATE_TIME: 'YYYY-MM-DD HH:mm:ss',
  DATE_TIME_SHORT: 'YYYY-MM-DD HH:mm',
  TIME: 'HH:mm:ss',
  YEAR_MONTH: 'YYYY-MM',
  API_DATE: 'YYYYMMDD', // API 使用的日期格式
} as const;

// ============================================================================
// 错误消息
// ============================================================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  UNAUTHORIZED: '未登录或登录已过期，请重新登录',
  FORBIDDEN: '您没有权限执行此操作',
  NOT_FOUND: '请求的资源不存在',
  SERVER_ERROR: '服务器错误，请稍后重试',
  VALIDATION_ERROR: '数据验证失败，请检查输入',
} as const;

// ============================================================================
// 成功消息
// ============================================================================

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: '登录成功',
  LOGOUT_SUCCESS: '登出成功',
  SAVE_SUCCESS: '保存成功',
  DELETE_SUCCESS: '删除成功',
  UPDATE_SUCCESS: '更新成功',
  CREATE_SUCCESS: '创建成功',
} as const;

// ============================================================================
// 路由路径
// ============================================================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  STOCKS: '/stocks',
  STOCK_DETAIL: (stockCode: string) => `/stocks/${stockCode}`,
  FAVORITES: '/favorites',
  SCREENER: '/screener',
  SCREENER_NEW: '/screener/new',
  SCREENER_EDIT: (strategyId: string) => `/screener/${strategyId}/edit`,
  SETTINGS: '/settings',
} as const;

export default {
  API_ENDPOINTS,
  APP_CONFIG,
  MARKETS,
  PERIODS,
  INDICATOR_TYPES,
  CONDITION_TYPES,
  DRAWING_TYPES,
  STORAGE_KEYS,
  DATE_FORMATS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
};
