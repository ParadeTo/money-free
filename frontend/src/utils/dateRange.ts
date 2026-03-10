import type { TimeRange } from '../store/chart.store';

/**
 * Calculate start date based on time range type
 * Does not return endDate, let backend automatically return data up to latest date
 */
export function getDateRangeFromTimeRange(timeRange: TimeRange): {
  startDate: string;
} {
  // Use current date as reference point to calculate start date
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
      // Get all data, set to an early date
      startDate.setFullYear(2000);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
  };
}

/**
 * Time range options configuration
 */
export const TIME_RANGE_OPTIONS = [
  { label: '1 Month', value: '1M' as TimeRange },
  { label: '3 Months', value: '3M' as TimeRange },
  { label: '6 Months', value: '6M' as TimeRange },
  { label: '1 Year', value: '1Y' as TimeRange },
  { label: '2 Years', value: '2Y' as TimeRange },
  { label: '5 Years', value: '5Y' as TimeRange },
  { label: 'All', value: 'ALL' as TimeRange },
];
