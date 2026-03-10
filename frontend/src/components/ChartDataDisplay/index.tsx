import { Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { KLineData } from '../../types';
import styles from './ChartDataDisplay.module.css';

const { Text } = Typography;

interface ChartDataDisplayProps {
  data?: KLineData;
  stockName?: string;
}

export function ChartDataDisplay({ data, stockName }: ChartDataDisplayProps) {
  if (!data) {
    return null;
  }

  const change = data.close - data.open;
  const changePercent = (change / data.open) * 100;
  const isUp = change >= 0;

  const formatNumber = (num: number, decimals = 2) => {
    return num.toFixed(decimals);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 100000000) {
      return `${(vol / 100000000).toFixed(2)}B`;
    } else if (vol >= 10000) {
      return `${(vol / 10000).toFixed(2)}K`;
    }
    return vol.toFixed(0);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(2)}B`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}K`;
    }
    return amount.toFixed(0);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className={styles.container}>
      <Space size="middle" className={styles.mainInfo}>
        <div className={styles.priceSection}>
          <Text className={styles.price} style={{ color: isUp ? '#f5222d' : '#52c41a' }}>
            {formatNumber(data.close)}
          </Text>
          <Text className={styles.change} style={{ color: isUp ? '#f5222d' : '#52c41a' }}>
            {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {' '}
            {formatNumber(Math.abs(change))} {formatNumber(Math.abs(changePercent))}%
          </Text>
        </div>

        <Space size="middle" className={styles.dataList}>
          <div className={styles.dataItem}>
            <span className={styles.label}>Time</span>
            <span className={styles.value}>
              {formatDateTime(data.date)}
            </span>
          </div>
          
          <div className={styles.dataItem}>
            <span className={styles.label}>Open</span>
            <span className={styles.value}>{formatNumber(data.open)}</span>
          </div>
          
          <div className={styles.dataItem}>
            <span className={styles.label}>High</span>
            <span className={styles.value}>{formatNumber(data.high)}</span>
          </div>
          
          <div className={styles.dataItem}>
            <span className={styles.label}>Low</span>
            <span className={styles.value}>{formatNumber(data.low)}</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.dataItem}>
            <span className={styles.label}>Vol</span>
            <span className={styles.value}>{formatVolume(data.volume)}</span>
          </div>

          <div className={styles.dataItem}>
            <span className={styles.label}>Amt</span>
            <span className={styles.value}>{formatAmount(data.amount)}</span>
          </div>
        </Space>
      </Space>
    </div>
  );
}
