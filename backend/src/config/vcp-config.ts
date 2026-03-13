/**
 * VCP分析配置
 * 支持不同市场的个性化参数配置
 */

export interface VcpMarketConfig {
  /** 市场代码 */
  market: 'SH' | 'SZ' | 'HK' | 'US';
  
  /** 市场名称 */
  marketName: string;

  /** 货币代码 */
  currency: 'CNY' | 'HKD' | 'USD';

  /** VCP形态识别参数 */
  vcpPatternConfig: {
    /** 最小收缩阶段数 */
    minContractionCount: number;
    
    /** 收缩识别的最小波动率降低比例（例如0.5表示波动率降低50%） */
    minVolatilityDecreaseRatio: number;
    
    /** 成交量萎缩判断标准：最后阶段成交量相对前期的比例 */
    volumeDryingUpThreshold: number;
  };

  /** 趋势模板参数 */
  trendTemplateConfig: {
    /** RS评级最低要求 */
    minRsRating: number;
    
    /** 距离52周高点的最大距离（百分比） */
    maxDistFrom52WeekHighPct: number;
    
    /** 距离52周低点的最小距离（百分比） */
    minDistFrom52WeekLowPct: number;
  };

  /** 回调分析参数 */
  pullbackConfig: {
    /** 回调幅度判断标准：超过此幅度认为是有效回调 */
    minPullbackPct: number;
    
    /** 最大回调幅度：超过此幅度可能不是健康回调 */
    maxHealthyPullbackPct: number;
  };

  /** 数据质量要求 */
  dataRequirements: {
    /** 最少需要的K线数据天数 */
    minKlineDays: number;
    
    /** 分析使用的K线窗口大小 */
    analysisWindowDays: number;
  };
}

/**
 * 默认VCP配置
 * 基于Mark Minervini的VCP模型
 */
const DEFAULT_VCP_CONFIG: Omit<VcpMarketConfig, 'market' | 'marketName' | 'currency'> = {
  vcpPatternConfig: {
    minContractionCount: 3,
    minVolatilityDecreaseRatio: 0.5,
    volumeDryingUpThreshold: 0.7,
  },
  trendTemplateConfig: {
    minRsRating: 70,
    maxDistFrom52WeekHighPct: 25,
    minDistFrom52WeekLowPct: 30,
  },
  pullbackConfig: {
    minPullbackPct: 3,
    maxHealthyPullbackPct: 15,
  },
  dataRequirements: {
    minKlineDays: 252, // 约1年交易日
    analysisWindowDays: 300,
  },
};

/**
 * 市场特定配置
 * 初期所有市场使用相同参数，未来可根据市场特性调整
 */
export const VCP_MARKET_CONFIGS: Record<string, VcpMarketConfig> = {
  SH: {
    market: 'SH',
    marketName: 'A股(沪)',
    currency: 'CNY',
    ...DEFAULT_VCP_CONFIG,
  },
  SZ: {
    market: 'SZ',
    marketName: 'A股(深)',
    currency: 'CNY',
    ...DEFAULT_VCP_CONFIG,
  },
  HK: {
    market: 'HK',
    marketName: '港股',
    currency: 'HKD',
    ...DEFAULT_VCP_CONFIG,
    // 港股特定调整（未来可能需要）
    // trendTemplateConfig: {
    //   ...DEFAULT_VCP_CONFIG.trendTemplateConfig,
    //   minRsRating: 65, // 港股市场可能需要稍低的RS标准
    // },
  },
  US: {
    market: 'US',
    marketName: '美股',
    currency: 'USD',
    ...DEFAULT_VCP_CONFIG,
    // 美股特定调整（未来可能需要）
    // dataRequirements: {
    //   minKlineDays: 252,
    //   analysisWindowDays: 300,
    // },
  },
};

/**
 * 获取指定市场的VCP配置
 */
export function getVcpConfig(market: string): VcpMarketConfig {
  const config = VCP_MARKET_CONFIGS[market.toUpperCase()];
  if (!config) {
    throw new Error(`Unknown market: ${market}. Supported markets: ${Object.keys(VCP_MARKET_CONFIGS).join(', ')}`);
  }
  return config;
}

/**
 * 获取所有支持的市场列表
 */
export function getSupportedMarkets(): string[] {
  return Object.keys(VCP_MARKET_CONFIGS);
}

/**
 * 检查市场是否支持
 */
export function isMarketSupported(market: string): boolean {
  return market.toUpperCase() in VCP_MARKET_CONFIGS;
}
