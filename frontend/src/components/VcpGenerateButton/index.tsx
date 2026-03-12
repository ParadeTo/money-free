import { Button } from 'antd';
import { FileTextOutlined, LoadingOutlined } from '@ant-design/icons';
import styles from './styles.module.css';

/**
 * VCP Generate Button Component (T028 [US1])
 * 
 * Button to trigger VCP analysis generation.
 * Shows loading state during generation.
 * 
 * @param stockCode Stock code to analyze
 * @param onClick Callback when button is clicked
 * @param loading Whether analysis is currently being generated
 */
export interface VcpGenerateButtonProps {
  stockCode: string;
  onClick: () => void;
  loading: boolean;
}

export function VcpGenerateButton({ onClick, loading }: VcpGenerateButtonProps) {
  return (
    <Button
      type="primary"
      icon={loading ? <LoadingOutlined /> : <FileTextOutlined />}
      onClick={onClick}
      loading={loading}
      disabled={loading}
      className={styles.generateButton}
    >
      {loading ? '生成中...' : '生成VCP分析报告'}
    </Button>
  );
}
