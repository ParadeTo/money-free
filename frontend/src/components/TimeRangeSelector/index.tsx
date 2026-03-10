import { Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { useChartStore } from '../../store/chart.store';
import { TIME_RANGE_OPTIONS } from '../../utils/dateRange';
import styles from './TimeRangeSelector.module.css';

export function TimeRangeSelector() {
  const { timeRange, setTimeRange } = useChartStore();

  const handleChange = (e: RadioChangeEvent) => {
    setTimeRange(e.target.value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.label}>时间范围</div>
      <Radio.Group 
        value={timeRange} 
        onChange={handleChange}
        buttonStyle="solid"
        size="small"
      >
        {TIME_RANGE_OPTIONS.map((option) => (
          <Radio.Button key={option.value} value={option.value}>
            {option.label}
          </Radio.Button>
        ))}
      </Radio.Group>
    </div>
  );
}
