import { Tag, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { TrendTemplateCheck } from '../../types/vcp';
import styles from './TrendTemplateChecks.module.css';

const { Text } = Typography;

interface TrendTemplateChecksProps {
  checks: TrendTemplateCheck[];
  allPass: boolean;
}

export function TrendTemplateChecks({ checks, allPass }: TrendTemplateChecksProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text strong>Trend Template</Text>
        <Tag color={allPass ? 'green' : 'orange'}>
          {allPass ? 'All Pass' : 'Partial Pass'}
        </Tag>
      </div>
      <div className={styles.checkList}>
        {checks.map((check) => (
          <div key={check.name} className={styles.checkItem}>
            <Space size={8}>
              {check.pass ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              )}
              <Text className={styles.label}>{check.label}</Text>
            </Space>
            <Text type="secondary" className={styles.values}>
              {check.currentValue?.toFixed(2)} / {check.threshold?.toFixed(2)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
