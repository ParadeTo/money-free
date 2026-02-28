import { ThemeConfig } from 'antd';

/**
 * Ant Design 主题配置
 * 自定义颜色、字体、组件样式等
 */
export const theme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',

    // 文本颜色
    colorText: 'rgba(0, 0, 0, 0.85)',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',

    // 边框
    colorBorder: '#d9d9d9',
    borderRadius: 6,

    // 字体
    fontSize: 14,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
      'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
      'Noto Color Emoji'`,

    // 布局
    controlHeight: 32,
    lineHeight: 1.5715,
  },

  components: {
    // Button 组件自定义
    Button: {
      controlHeight: 32,
      borderRadius: 6,
    },

    // Input 组件自定义
    Input: {
      controlHeight: 32,
      borderRadius: 6,
    },

    // Table 组件自定义
    Table: {
      headerBg: '#fafafa',
      headerColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: '#f0f0f0',
    },

    // Card 组件自定义
    Card: {
      borderRadiusLG: 8,
    },

    // Menu 组件自定义
    Menu: {
      itemBorderRadius: 6,
      subMenuItemBorderRadius: 6,
    },
  },
};

/**
 * 股票相关颜色
 */
export const stockColors = {
  // 涨跌颜色
  up: '#ef5350',      // 红色 (涨)
  down: '#26a69a',    // 绿色 (跌)
  neutral: '#9e9e9e', // 灰色 (平)

  // K线图颜色
  candleUp: '#ef5350',
  candleDown: '#26a69a',
  candleWickUp: '#ef5350',
  candleWickDown: '#26a69a',

  // 均线颜色
  ma5: '#ffa726',    // 橙色
  ma10: '#ab47bc',   // 紫色
  ma20: '#42a5f5',   // 蓝色
  ma30: '#66bb6a',   // 绿色
  ma50: '#ff7043',   // 深橙色
  ma150: '#7e57c2',  // 深紫色
  ma200: '#5c6bc0',  // 深蓝色

  // 技术指标颜色
  kdjK: '#ffa726',   // K 线 - 橙色
  kdjD: '#42a5f5',   // D 线 - 蓝色
  kdjJ: '#ab47bc',   // J 线 - 紫色
  rsi: '#66bb6a',    // RSI - 绿色

  // 成交量颜色
  volumeUp: 'rgba(239, 83, 80, 0.5)',
  volumeDown: 'rgba(38, 166, 154, 0.5)',
};

/**
 * Chart 主题配置 (TradingView Lightweight Charts)
 */
export const chartTheme = {
  layout: {
    background: {
      color: '#ffffff',
    },
    textColor: 'rgba(0, 0, 0, 0.85)',
  },
  grid: {
    vertLines: {
      color: '#f0f0f0',
    },
    horzLines: {
      color: '#f0f0f0',
    },
  },
  crosshair: {
    mode: 0, // CrosshairMode.Normal
  },
  rightPriceScale: {
    borderColor: '#d9d9d9',
  },
  timeScale: {
    borderColor: '#d9d9d9',
    timeVisible: true,
    secondsVisible: false,
  },
};

export default theme;
