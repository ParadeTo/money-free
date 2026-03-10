import type { TimeRange } from '../store/chart.store';

/**
 * 根据时间范围类型计算起始日期
 * 不返回 endDate，让后端自动返回到最新日期的数据
 */
export function getDateRangeFromTimeRange(timeRange: TimeRange): {
  startDate: string;
} {
  // 使用当前日期作为参考点计算起始日期
  const today = new Date();
  const startDate = new Date(today);

  switch (timeRange) {
    case '1M':
      startDate.setMonth(today.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(today.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(today.getMonth() - 6);
      break;
    case '1Y':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    case '2Y':
      startDate.setFullYear(today.getFullYear() - 2);
      break;
    case '5Y':
      startDate.setFullYear(today.getFullYear() - 5);
      break;
    case 'ALL':
      // 获取所有数据，设置一个很早的日期
      startDate.setFullYear(2000);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
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
