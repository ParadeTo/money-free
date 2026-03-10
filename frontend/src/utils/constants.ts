/**
 * Application Configuration Constants
 */

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },

  // Stocks
  STOCKS: {
    LIST: '/stocks',
    DETAIL: (stockCode: string) => `/stocks/${stockCode}`,
  },

  // K-Line Data
  KLINE: {
    LIST: (stockCode: string) => `/stocks/${stockCode}/kline`,
  },

  // Technical Indicators
  INDICATORS: {
    LIST: (stockCode: string) => `/stocks/${stockCode}/indicators`,
    BY_TYPE: (stockCode: string, type: string) => `/stocks/${stockCode}/indicators/${type}`,
  },

  // Favorites
  FAVORITES: {
    LIST: '/favorites',
    ADD: '/favorites',
    REMOVE: (favoriteId: number) => `/favorites/${favoriteId}`,
    GROUPS: '/favorites/groups',
    BY_GROUP: (groupName: string) => `/favorites/groups/${groupName}`,
  },

  // Screener Strategy
  SCREENER: {
    STRATEGIES: '/screener/strategies',
    DETAIL: (strategyId: string) => `/screener/strategies/${strategyId}`,
    EXECUTE: (strategyId: string) => `/screener/strategies/${strategyId}/execute`,
  },

  // Drawings
  DRAWINGS: {
    LIST: (stockCode: string) => `/drawings/${stockCode}`,
    CREATE: '/drawings',
    DELETE: (drawingId: string) => `/drawings/${drawingId}`,
  },

  // Data Update
  DATA_UPDATE: {
    TRIGGER: '/data-update/trigger',
    STATUS: (taskId: string) => `/data-update/status/${taskId}`,
    LOGS: '/data-update/logs',
  },

  // Health Check
  HEALTH: {
    CHECK: '/health',
    DB: '/health/db',
  },
};

// ============================================================================
// Application Config
// ============================================================================

export const APP_CONFIG = {
  NAME: 'StockHub',
  VERSION: '1.0.0',
  DESCRIPTION: 'A-Share Technical Analysis Platform',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// ============================================================================
// Stock Markets
// ============================================================================

export const MARKETS = {
  SH: { value: 'SH', label: 'Shanghai Stock Exchange' },
  SZ: { value: 'SZ', label: 'Shenzhen Stock Exchange' },
} as const;

export const MARKET_OPTIONS = Object.values(MARKETS);

// ============================================================================
// K-Line Periods
// ============================================================================

export const PERIODS = {
  DAILY: { value: 'daily', label: 'Daily' },
  WEEKLY: { value: 'weekly', label: 'Weekly' },
} as const;

export const PERIOD_OPTIONS = Object.values(PERIODS);

// ============================================================================
// Technical Indicators
// ============================================================================

export const INDICATOR_TYPES = {
  MA: { value: 'ma', label: 'Moving Average (MA)' },
  KDJ: { value: 'kdj', label: 'Stochastic (KDJ)' },
  RSI: { value: 'rsi', label: 'Relative Strength Index (RSI)' },
  VOLUME: { value: 'volume', label: 'Volume' },
  AMOUNT: { value: 'amount', label: 'Amount' },
  WEEK52_MARKER: { value: 'week52_marker', label: '52-Week Marker' },
} as const;

export const INDICATOR_OPTIONS = Object.values(INDICATOR_TYPES);

// MA Parameter Config
export const MA_PERIODS = {
  DAILY: [50, 150, 200],
  WEEKLY: [10, 30, 40],
};

// KDJ Parameter Config
export const KDJ_PARAMS = {
  PERIOD: 9,
  K_PERIOD: 3,
  D_PERIOD: 3,
};

// RSI Parameter Config
export const RSI_PERIOD = 14;

// ============================================================================
// Screening Conditions
// ============================================================================

export const CONDITION_TYPES = {
  INDICATOR_VALUE: { value: 'indicator_value', label: 'Indicator Value' },
  PATTERN: { value: 'pattern', label: 'Pattern Recognition' },
  PRICE_CHANGE: { value: 'price_change', label: 'Price Change' },
  VOLUME_CHANGE: { value: 'volume_change', label: 'Volume Change' },
  WEEK_52_HIGH: { value: 'week_52_high', label: '52-Week High' },
  WEEK_52_LOW: { value: 'week_52_low', label: '52-Week Low' },
} as const;

export const CONDITION_TYPE_OPTIONS = Object.values(CONDITION_TYPES);

export const OPERATORS = [
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
  { value: '>=', label: 'Greater than or equal (>=)' },
  { value: '<=', label: 'Less than or equal (<=)' },
  { value: '=', label: 'Equal (=)' },
];

export const PATTERNS = [
  { value: 'kdj_golden_cross', label: 'KDJ Golden Cross' },
  { value: 'kdj_death_cross', label: 'KDJ Death Cross' },
  { value: 'price_above_ma', label: 'Price Above MA' },
  { value: 'price_below_ma', label: 'Price Below MA' },
];

// ============================================================================
// Drawing Types
// ============================================================================

export const DRAWING_TYPES = {
  TREND_LINE: { value: 'trend_line', label: 'Trend Line' },
  HORIZONTAL_LINE: { value: 'horizontal_line', label: 'Horizontal Line' },
  VERTICAL_LINE: { value: 'vertical_line', label: 'Vertical Line' },
  RECTANGLE: { value: 'rectangle', label: 'Rectangle' },
} as const;

export const DRAWING_TYPE_OPTIONS = Object.values(DRAWING_TYPES);

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'access_token',
  USER_INFO: 'user_info',
  THEME: 'theme_mode',
  RECENT_STOCKS: 'recent_stocks',
  FAVORITE_GROUPS: 'favorite_groups',
} as const;

// ============================================================================
// Date Formats
// ============================================================================

export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATE_TIME: 'YYYY-MM-DD HH:mm:ss',
  DATE_TIME_SHORT: 'YYYY-MM-DD HH:mm',
  TIME: 'HH:mm:ss',
  YEAR_MONTH: 'YYYY-MM',
  API_DATE: 'YYYYMMDD', // Date format used by API
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed, please check network and retry',
  UNAUTHORIZED: 'Not logged in or session expired, please login again',
  FORBIDDEN: 'You do not have permission to perform this operation',
  NOT_FOUND: 'The requested resource does not exist',
  SERVER_ERROR: 'Server error, please try again later',
  VALIDATION_ERROR: 'Data validation failed, please check input',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  SAVE_SUCCESS: 'Save successful',
  DELETE_SUCCESS: 'Delete successful',
  UPDATE_SUCCESS: 'Update successful',
  CREATE_SUCCESS: 'Create successful',
} as const;

// ============================================================================
// Route Paths
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
