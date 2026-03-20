/**
 * 数据验证工具函数
 */

import { KLineRecord, ValidationError } from '../types/optimization';

/**
 * 验证K线数据的完整性和合理性
 * @param record K线记录
 * @returns 验证错误数组(空数组表示验证通过)
 */
export function validateKLineData(record: KLineRecord): ValidationError[] {
  const errors: ValidationError[] = [];

  // 检查必填字段
  if (!record.date) {
    errors.push({ field: 'date', value: record.date, reason: '日期字段缺失' });
  }

  if (record.open === undefined || record.open === null) {
    errors.push({ field: 'open', value: record.open, reason: '开盘价缺失' });
  }

  if (record.high === undefined || record.high === null) {
    errors.push({ field: 'high', value: record.high, reason: '最高价缺失' });
  }

  if (record.low === undefined || record.low === null) {
    errors.push({ field: 'low', value: record.low, reason: '最低价缺失' });
  }

  if (record.close === undefined || record.close === null) {
    errors.push({ field: 'close', value: record.close, reason: '收盘价缺失' });
  }

  if (record.volume === undefined || record.volume === null) {
    errors.push({ field: 'volume', value: record.volume, reason: '成交量缺失' });
  }

  // 如果有缺失字段，直接返回
  if (errors.length > 0) {
    return errors;
  }

  // 检查数值合理性
  if (record.open <= 0) {
    errors.push({ field: 'open', value: record.open, reason: '开盘价必须大于0' });
  }

  if (record.high <= 0) {
    errors.push({ field: 'high', value: record.high, reason: '最高价必须大于0' });
  }

  if (record.low <= 0) {
    errors.push({ field: 'low', value: record.low, reason: '最低价必须大于0' });
  }

  if (record.close <= 0) {
    errors.push({ field: 'close', value: record.close, reason: '收盘价必须大于0' });
  }

  if (record.volume < 0) {
    errors.push({ field: 'volume', value: record.volume, reason: '成交量不能为负数' });
  }

  if (record.amount < 0) {
    errors.push({ field: 'amount', value: record.amount, reason: '成交额不能为负数' });
  }

  // 检查价格逻辑
  const maxOpenClose = Math.max(record.open, record.close);
  const minOpenClose = Math.min(record.open, record.close);

  if (record.high < maxOpenClose) {
    errors.push({
      field: 'high',
      value: record.high,
      reason: `最高价(${record.high})不能低于开盘价和收盘价的最大值(${maxOpenClose})`,
    });
  }

  if (record.low > minOpenClose) {
    errors.push({
      field: 'low',
      value: record.low,
      reason: `最低价(${record.low})不能高于开盘价和收盘价的最小值(${minOpenClose})`,
    });
  }

  return errors;
}

/**
 * 验证K线数据批次
 * @param records K线记录数组
 * @returns 包含错误的记录索引和错误详情
 */
export function validateKLineBatch(
  records: KLineRecord[],
): { index: number; record: KLineRecord; errors: ValidationError[] }[] {
  const invalidRecords: { index: number; record: KLineRecord; errors: ValidationError[] }[] = [];

  records.forEach((record, index) => {
    const errors = validateKLineData(record);
    if (errors.length > 0) {
      invalidRecords.push({ index, record, errors });
    }
  });

  return invalidRecords;
}

/**
 * 检查是否为有效的日期
 * @param date 日期
 * @returns 是否有效
 */
export function isValidDate(date: any): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return !isNaN(d.getTime());
}

/**
 * 格式化验证错误为可读字符串
 * @param errors 验证错误数组
 * @returns 格式化的错误消息
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e) => `${e.field}: ${e.reason} (value: ${e.value})`).join('; ');
}
