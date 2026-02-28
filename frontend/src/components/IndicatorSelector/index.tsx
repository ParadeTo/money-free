/**
 * 技术指标选择器
 * 
 * 支持选择显示的技术指标：MA、KDJ、RSI、成交量、成交额
 */

import { Checkbox } from 'antd';
import type { IndicatorType } from '../../types/stock';

interface IndicatorSelectorProps {
  selectedIndicators: IndicatorType[];
  period: 'daily' | 'weekly';
  onChange: (indicators: IndicatorType[]) => void;
}

export function IndicatorSelector({
  selectedIndicators,
  period,
  onChange
}: IndicatorSelectorProps) {
  // 根据周期决定可用的MA指标
  const maOptions = period === 'daily'
    ? [
        { label: 'MA50 (50日均线)', value: 'MA50' as IndicatorType },
        { label: 'MA150 (150日均线)', value: 'MA150' as IndicatorType },
        { label: 'MA200 (200日均线)', value: 'MA200' as IndicatorType },
      ]
    : [
        { label: 'MA10 (10周均线)', value: 'MA10' as IndicatorType },
        { label: 'MA30 (30周均线)', value: 'MA30' as IndicatorType },
        { label: 'MA40 (40周均线)', value: 'MA40' as IndicatorType },
      ];

  const otherOptions = [
    { label: 'KDJ (随机指标)', value: 'KDJ_K' as IndicatorType },
    { label: 'RSI (相对强弱)', value: 'RSI' as IndicatorType },
  ];

  const volumeOptions = [
    { label: '成交量', value: 'volume_ma52w' as IndicatorType },
    { label: '成交额', value: 'turnover_ma52w' as IndicatorType },
  ];

  const handleChange = (checkedValues: IndicatorType[]) => {
    onChange(checkedValues);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a0aec0' }}>
          均线指标
        </h4>
        <Checkbox.Group
          options={maOptions}
          value={selectedIndicators}
          onChange={handleChange as any}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        />
      </div>

      <div>
        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a0aec0' }}>
          技术指标
        </h4>
        <Checkbox.Group
          options={otherOptions}
          value={selectedIndicators}
          onChange={handleChange as any}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        />
      </div>

      <div>
        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a0aec0' }}>
          成交数据
        </h4>
        <Checkbox.Group
          options={volumeOptions}
          value={selectedIndicators}
          onChange={handleChange as any}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        />
      </div>
    </div>
  );
}
