import { Radio, Space, Button, Segmented } from 'antd';
import { useChartStore } from '../../store/chart.store';
import type { TimeRange, Period, SubChartIndicator, VolumeChartIndicator } from '../../store/chart.store';
import styles from './ChartToolbar.module.css';

export function ChartToolbar() {
  const { 
    period,
    timeRange,
    showMA,
    subChart1Indicator,
    subChart2Indicator,
    setPeriod,
    setTimeRange,
    setShowMA,
    setSubChart1Indicator,
    setSubChart2Indicator,
  } = useChartStore();

  const timeRangeOptions = [
    { label: '1月', value: '1M' },
    { label: '3月', value: '3M' },
    { label: '6月', value: '6M' },
    { label: '1年', value: '1Y' },
    { label: '2年', value: '2Y' },
    { label: '5年', value: '5Y' },
    { label: '全部', value: 'ALL' },
  ];

  const subChart1Options = [
    { label: 'KDJ', value: 'kdj' },
    { label: 'RSI', value: 'rsi' },
    { label: 'MACD', value: 'none', disabled: true },
  ];

  const subChart2Options = [
    { label: 'VOL', value: 'volume' },
    { label: '成交额', value: 'amount' },
    { label: '隐藏', value: 'none' },
  ];

  return (
    <div className={styles.toolbar}>
      <div className={styles.section}>
        <Space size="small">
          <span className={styles.label}>周期:</span>
          <Segmented
            value={period}
            onChange={(value) => setPeriod(value as Period)}
            options={[
              { label: '日K', value: 'daily' },
              { label: '周K', value: 'weekly' },
            ]}
            size="small"
          />
        </Space>
      </div>

      <div className={styles.section}>
        <Space size="small">
          <span className={styles.label}>时间:</span>
          <Radio.Group
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            size="small"
            optionType="button"
            buttonStyle="solid"
          >
            {timeRangeOptions.map((opt) => (
              <Radio.Button key={opt.value} value={opt.value}>
                {opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Space>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <Space size="small">
          <span className={styles.label}>主图:</span>
          <Button
            type={showMA ? 'primary' : 'default'}
            size="small"
            onClick={() => setShowMA(!showMA)}
          >
            MA均线
          </Button>
        </Space>
      </div>

      <div className={styles.section}>
        <Space size="middle">
          <Space size="small">
            <span className={styles.label}>指标:</span>
            <Radio.Group
              value={subChart1Indicator}
              onChange={(e) => setSubChart1Indicator(e.target.value as SubChartIndicator)}
              size="small"
              optionType="button"
            >
              {subChart1Options.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Space>
          
          <Radio.Group
            value={subChart2Indicator}
            onChange={(e) => setSubChart2Indicator(e.target.value as VolumeChartIndicator)}
            size="small"
            optionType="button"
          >
            {subChart2Options.map((opt) => (
              <Radio.Button key={opt.value} value={opt.value}>
                {opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Space>
      </div>
    </div>
  );
}
