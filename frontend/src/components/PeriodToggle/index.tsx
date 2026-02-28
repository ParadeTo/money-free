/**
 * 周期切换组件
 * 
 * 日K/周K切换
 */

import { Radio } from 'antd';
import type { Period } from '../../types/stock';

interface PeriodToggleProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <Radio.Group
      value={value}
      onChange={(e) => onChange(e.target.value)}
      buttonStyle="solid"
      size="large"
    >
      <Radio.Button value="daily">日K</Radio.Button>
      <Radio.Button value="weekly">周K</Radio.Button>
    </Radio.Group>
  );
}
