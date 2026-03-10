import { Space, Tag } from 'antd';
import type { TechnicalIndicator } from '../../types';
import type { KLineData } from '../../types';
import type { Period } from '../../store/chart.store';
import styles from './IndicatorValueDisplay.module.css';

interface IndicatorValueDisplayProps {
  currentData?: KLineData;
  indicators: TechnicalIndicator[];
  period: Period;
  showMA: boolean;
}

export function IndicatorValueDisplay({ 
  currentData, 
  indicators, 
  period,
  showMA 
}: IndicatorValueDisplayProps) {
  if (!currentData) {
    return null;
  }

  const dateStr = new Date(currentData.date).toISOString().split('T')[0];
  
  // Find indicator data for current date
  const maIndicator = indicators.find(
    (ind) => ind.indicatorType === 'ma' && 
    new Date(ind.date).toISOString().split('T')[0] === dateStr
  );

  if (!showMA || !maIndicator) {
    return null;
  }

  const maValues = typeof maIndicator.values === 'string' 
    ? JSON.parse(maIndicator.values) 
    : maIndicator.values;

  const getMAPeriods = () => {
    if (period === 'daily') {
      return [
        { key: 'ma50', label: 'MA50', color: '#2196F3' },
        { key: 'ma150', label: 'MA150', color: '#FF9800' },
        { key: 'ma200', label: 'MA200', color: '#9C27B0' },
      ];
    } else {
      return [
        { key: 'ma10', label: 'MA10', color: '#2196F3' },
        { key: 'ma30', label: 'MA30', color: '#FF9800' },
        { key: 'ma40', label: 'MA40', color: '#9C27B0' },
      ];
    }
  };

  const maPeriods = getMAPeriods();

  return (
    <div className={styles.container}>
      <Space size="small">
        {maPeriods.map((ma) => {
          const value = maValues[ma.key];
          if (!value) return null;
          
          return (
            <Tag key={ma.key} color={ma.color} className={styles.tag}>
              {ma.label}: {value.toFixed(2)}
            </Tag>
          );
        })}
      </Space>
    </div>
  );
}
