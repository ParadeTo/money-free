import { Radio, Card } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { useChartStore, type Period } from '../../store/chart.store';

export function PeriodToggle() {
  const { period, setPeriod } = useChartStore();

  const handleChange = (e: RadioChangeEvent) => {
    setPeriod(e.target.value as Period);
  };

  return (
    <Card 
      title="周期" 
      size="small" 
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <Radio.Group value={period} onChange={handleChange} buttonStyle="solid">
        <Radio.Button value="daily">日线</Radio.Button>
        <Radio.Button value="weekly">周线</Radio.Button>
      </Radio.Group>
    </Card>
  );
}
