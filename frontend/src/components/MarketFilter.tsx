import { Select } from 'antd';

export type MarketFilterValue = 'all' | 'A-SHARE' | 'HK' | 'US';

interface MarketFilterProps {
  value: MarketFilterValue;
  onChange: (value: MarketFilterValue) => void;
}

const MARKET_OPTIONS = [
  { label: '全部市场', value: 'all' },
  { label: 'A股', value: 'A-SHARE' },
  { label: '港股', value: 'HK' },
  { label: '美股', value: 'US' },
];

export function MarketFilter({ value, onChange }: MarketFilterProps) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={MARKET_OPTIONS}
      style={{ width: 120 }}
    />
  );
}
