import type { TimeRange } from '../store/chart.store';

/**
 * 根据时间范围类型计算日期区间
 * 注意：endDate 设置为数据的最新日期（2024-02-28），而不是当前系统日期
 */
export function getDateRangeFromTimeRange(timeRange: TimeRange): {
  startDate: string;
  endDate: string;
} {
  // 使用数据的最新日期作为结束日期
  const endDate = new Date('2024-02-28');
  const startDate = new Date('2024-02-28');

  switch (timeRange) {
    case '1M':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case '2Y':
      startDate.setFullYear(endDate.getFullYear() - 2);
      break;
    case '5Y':
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    case 'ALL':
      // 获取所有数据，设置一个很早的日期
      startDate.setFullYear(2000);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * 时间范围选项配置
 */
export const TIME_RANGE_OPTIONS = [
  { label: '1个月', value: '1M' as TimeRange },
  { label: '3个月', value: '3M' as TimeRange },
  { label: '6个月', value: '6M' as TimeRange },
  { label: '1年', value: '1Y' as TimeRange },
  { label: '2年', value: '2Y' as TimeRange },
  { label: '5年', value: '5Y' as TimeRange },
  { label: '全部', value: 'ALL' as TimeRange },
];
