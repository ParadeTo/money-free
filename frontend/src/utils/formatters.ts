/**
 * Formatting utilities for Chinese number formats
 * 
 * All formatters follow Chinese conventions:
 * - Percentages: 2 decimal places
 * - Prices: 2 decimal places with comma separator
 * - Volume: in "手" (lots, 100 shares each)
 * - Dates: Chinese locale
 */

/**
 * Format percentage value
 * @example formatPercent(12.3456) => "12.35%"
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format price with comma separator
 * @example formatPrice(1234.56) => "1,234.56"
 */
export function formatPrice(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format volume to "手" (lots)
 * @example formatVolume(123456) => "1,234 手"
 */
export function formatVolume(value: number): string {
  const lots = Math.floor(value / 100);
  return `${lots.toLocaleString('zh-CN')} 手`;
}

/**
 * Format date to Chinese locale
 * @example formatDate('2026-03-11') => "2026年3月11日"
 * @example formatDate(new Date('2026-03-11')) => "2026年3月11日"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date to short format (YYYY-MM-DD)
 * @example formatDateShort('2026-03-11') => "2026-03-11"
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format number with comma separator
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}

/**
 * Format percentage with sign (+ or -)
 * @example formatPercentWithSign(2.15) => "+2.15%"
 * @example formatPercentWithSign(-1.5) => "-1.50%"
 */
export function formatPercentWithSign(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Get color class for percentage change (Chinese stock convention: green = up, red = down)
 * @example getPercentChangeColor(2.15) => "text-green-600"
 * @example getPercentChangeColor(-1.5) => "text-red-600"
 */
export function getPercentChangeColor(value: number): string {
  if (value > 0) return 'text-green-600'; // 涨
  if (value < 0) return 'text-red-600'; // 跌
  return 'text-gray-600'; // 平
}

/**
 * Format pullback status based on daysSinceLow
 * @example formatPullbackStatus(0) => "🔴 正在回调中"
 * @example formatPullbackStatus(3) => "🟡 3天前到达最低点"
 * @example formatPullbackStatus(10) => "🟢 10天前到达最低点"
 */
export function formatPullbackStatus(daysSinceLow: number): string {
  if (daysSinceLow === 0) return '🔴 正在回调中';
  if (daysSinceLow <= 3) return `🟡 ${daysSinceLow}天前到达最低点`;
  return `🟢 ${daysSinceLow}天前到达最低点`;
}

/**
 * Format scan date with expiry warning
 * @example formatScanDate('2026-03-11', false) => "扫描日期: 2026年3月11日"
 * @example formatScanDate('2026-03-01', true) => "扫描日期: 2026年3月1日 ⚠️ 已过期"
 */
export function formatScanDate(date: string, isExpired: boolean): string {
  const formattedDate = formatDate(date);
  return `扫描日期: ${formattedDate}${isExpired ? ' ⚠️ 已过期' : ''}`;
}
