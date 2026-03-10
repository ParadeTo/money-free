import { Checkbox, Space, Card } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { useChartStore, type IndicatorType } from '../../store/chart.store';

const INDICATOR_OPTIONS = [
  { value: 'ma', label: '移动平均线 (MA)' },
  { value: 'kdj', label: 'KDJ' },
  { value: 'rsi', label: 'RSI' },
  { value: 'volume', label: '成交量' },
  { value: 'amount', label: '成交额' },
] as const;

export function IndicatorSelector() {
  const { selectedIndicators, toggleIndicator } = useChartStore();

  const handleChange = (e: CheckboxChangeEvent) => {
    const indicator = e.target.value as IndicatorType;
    toggleIndicator(indicator);
  };

  return (
    <Card 
      title="技术指标" 
      size="small" 
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <Space direction="vertical" size="small">
        {INDICATOR_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            value={option.value}
            checked={selectedIndicators.includes(option.value)}
            onChange={handleChange}
          >
            {option.label}
          </Checkbox>
        ))}
      </Space>
    </Card>
  );
}
