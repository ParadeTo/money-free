import { Select, Checkbox } from 'antd';
import { useChartStore } from '../../store/chart.store';
import styles from './SubChartSelector.module.css';

export function SubChartSelector() {
  const { 
    showMA, 
    subChart1Indicator, 
    subChart2Indicator,
    setShowMA,
    setSubChart1Indicator, 
    setSubChart2Indicator 
  } = useChartStore();

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Checkbox 
          checked={showMA}
          onChange={(e) => setShowMA(e.target.checked)}
        >
          Show MA
        </Checkbox>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Sub Chart 1</div>
        <Select
          value={subChart1Indicator}
          onChange={setSubChart1Indicator}
          style={{ width: '100%' }}
          size="small"
        >
          <Select.Option value="none">Hide</Select.Option>
          <Select.Option value="rsi">RSI Indicator</Select.Option>
          <Select.Option value="kdj">KDJ Indicator</Select.Option>
        </Select>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Sub Chart 2</div>
        <Select
          value={subChart2Indicator}
          onChange={setSubChart2Indicator}
          style={{ width: '100%' }}
          size="small"
        >
          <Select.Option value="none">Hide</Select.Option>
          <Select.Option value="volume">Volume</Select.Option>
          <Select.Option value="amount">Amount</Select.Option>
        </Select>
      </div>
    </div>
  );
}
