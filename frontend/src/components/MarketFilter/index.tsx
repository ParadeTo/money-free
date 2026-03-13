/**
 * Market filter component
 * Allows users to filter stocks by market type
 */

import { Radio, Space, Tag } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { MARKET_LABELS } from '../../types/stock';

export type MarketFilterValue = 'all' | 'SH' | 'SZ' | 'HK' | 'US' | 'A-share';

interface MarketFilterProps {
  value?: MarketFilterValue;
  onChange?: (value: MarketFilterValue) => void;
  showCount?: boolean;
  counts?: Record<string, number>;
}

export function MarketFilter({
  value = 'all',
  onChange,
  showCount = false,
  counts = {},
}: MarketFilterProps) {
  const handleChange = (e: RadioChangeEvent) => {
    onChange?.(e.target.value);
  };

  const renderLabel = (market: string, label: string) => {
    if (!showCount || !counts[market]) {
      return label;
    }
    return (
      <Space size="small">
        {label}
        <Tag>{counts[market]}</Tag>
      </Space>
    );
  };

  return (
    <Radio.Group value={value} onChange={handleChange} buttonStyle="solid">
      <Radio.Button value="all">{renderLabel('all', 'All Markets')}</Radio.Button>
      <Radio.Button value="A-share">{renderLabel('A-share', 'A Share')}</Radio.Button>
      <Radio.Button value="HK">{renderLabel('HK', 'Hong Kong')}</Radio.Button>
      <Radio.Button value="US">{renderLabel('US', 'US Stocks')}</Radio.Button>
    </Radio.Group>
  );
}
