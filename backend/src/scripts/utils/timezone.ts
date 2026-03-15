/**
 * 时区转换工具函数
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { MARKET_TIMEZONES, MarketType } from '../types/optimization';

/**
 * 将市场本地时间转换为UTC时间
 * @param localDate 本地时间
 * @param market 市场类型
 * @returns UTC时间
 */
export function toUTC(localDate: Date, market: MarketType): Date {
  const timezone = MARKET_TIMEZONES[market];
  return fromZonedTime(localDate, timezone);
}

/**
 * 将UTC时间转换为市场本地时间
 * @param utcDate UTC时间
 * @param market 市场类型
 * @returns 市场本地时间
 */
export function toMarketTime(utcDate: Date, market: MarketType): Date {
  const timezone = MARKET_TIMEZONES[market];
  return toZonedTime(utcDate, timezone);
}

/**
 * 获取市场的当前本地日期(日期部分，不含时间)
 * @param market 市场类型
 * @returns 日期字符串 YYYY-MM-DD
 */
export function getMarketToday(market: MarketType): string {
  const now = new Date();
  const marketTime = toMarketTime(now, market);
  return marketTime.toISOString().split('T')[0];
}

/**
 * 比较两个日期(只比较日期部分，忽略时间)
 * @param date1 日期1
 * @param date2 日期2
 * @returns -1 (date1 < date2), 0 (相等), 1 (date1 > date2)
 */
export function compareDates(date1: Date | string, date2: Date | string): number {
  const str1 = typeof date1 === 'string' ? date1 : date1.toISOString().split('T')[0];
  const str2 = typeof date2 === 'string' ? date2 : date2.toISOString().split('T')[0];
  
  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}

/**
 * 标准化日期为UTC零点
 * @param date 输入日期
 * @returns UTC零点日期
 */
export function normalizeToUTCMidnight(date: Date | string): Date {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return new Date(`${dateStr}T00:00:00.000Z`);
}
