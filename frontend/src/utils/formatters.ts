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
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format volume to lots
 * @example formatVolume(123456) => "1,234 lots"
 */
export function formatVolume(value: number): string {
  const lots = Math.floor(value / 100);
  return `${lots.toLocaleString('en-US')} lots`;
}

/**
 * Format date to locale
 * @example formatDate('2026-03-11') => "March 11, 2026"
 * @example formatDate(new Date('2026-03-11')) => "March 11, 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
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
  return value.toLocaleString('en-US');
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
  if (value > 0) return 'text-green-600'; // Up
  if (value < 0) return 'text-red-600'; // Down
  return 'text-gray-600'; // Flat
}

/**
 * Format pullback status based on daysSinceLow
 * @example formatPullbackStatus(0) => "🔴 In Pullback"
 * @example formatPullbackStatus(3) => "🟡 Low 3 days ago"
 * @example formatPullbackStatus(10) => "🟢 Low 10 days ago"
 */
export function formatPullbackStatus(daysSinceLow: number): string {
  if (daysSinceLow === 0) return '🔴 In Pullback';
  if (daysSinceLow <= 3) return `🟡 Low ${daysSinceLow} day${daysSinceLow > 1 ? 's' : ''} ago`;
  return `🟢 Low ${daysSinceLow} days ago`;
}

/**
 * Format scan date with expiry warning
 * @example formatScanDate('2026-03-11', false) => "Scan Date: March 11, 2026"
 * @example formatScanDate('2026-03-01', true) => "Scan Date: March 1, 2026 ⚠️ Expired"
 */
export function formatScanDate(date: string, isExpired: boolean): string {
  const formattedDate = formatDate(date);
  return `Scan Date: ${formattedDate}${isExpired ? ' ⚠️ Expired' : ''}`;
}
