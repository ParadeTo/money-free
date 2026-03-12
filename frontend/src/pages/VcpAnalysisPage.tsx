import { useParams } from 'react-router-dom';
import { Spin, Alert, Card, Tag, Descriptions, Typography, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  WarningOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useVcpAnalysis } from '../hooks/useVcpAnalysis';
import { 
  formatPercent, 
  formatPrice, 
  formatScanDate, 
  formatPullbackStatus,
} from '../utils/formatters';
import styles from './VcpAnalysisPage.module.css';

const { Title, Text } = Typography;

/**
 * VCP Analysis Page (T029 [US1])
 * 
 * Displays comprehensive VCP analysis for a single stock.
 * Shows summary, contractions, pullbacks, K-line data, and trend template.
 */
export function VcpAnalysisPage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const { data: analysis, isLoading, error } = useVcpAnalysis(stockCode || '', false);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="Loading VCP analysis data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="Load Failed"
          description={error.message || 'Unable to load VCP analysis data, please try again later'}
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="No Data"
          description="VCP analysis data not found for this stock"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const { summary, hasVcp, isExpired, cached, scanDate } = analysis;

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Title level={2} className={styles.title}>
            {analysis.stockName}
            <Text type="secondary" className={styles.stockCode}>
              ({analysis.stockCode})
            </Text>
          </Title>
          <Space>
            <Tag color={hasVcp ? 'success' : 'default'} icon={hasVcp ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
              VCP Pattern: {hasVcp ? 'Valid' : 'Invalid'}
            </Tag>
            {cached && <Tag color="blue">Source: Cached</Tag>}
          </Space>
        </div>
        <div className={styles.headerRight}>
          <Text type="secondary">Scan Date: {formatScanDate(scanDate)}</Text>
          {isExpired && (
            <Alert
              message="Data Expired"
              description={`Analysis data is over 7 days old (${formatScanDate(scanDate)}), recommend re-scanning`}
              type="warning"
              icon={<WarningOutlined />}
              showIcon
              closable
              className={styles.expiredAlert}
            />
          )}
        </div>
      </div>

      {/* Summary Section */}
      <Card title="Summary" className={styles.summaryCard}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="Latest Price">
            ¥{formatPrice(summary.latestPrice)}
            <Text type={summary.priceChangePct >= 0 ? 'success' : 'danger'} className={styles.changeText}>
              ({formatPercent(summary.priceChangePct, true)})
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Contractions">
            {summary.contractionCount} times
          </Descriptions.Item>
          <Descriptions.Item label="Last Contraction">
            {formatPercent(summary.lastContractionPct)}
          </Descriptions.Item>
          <Descriptions.Item label="Volume Dry Up">
            {summary.volumeDryingUp ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>Yes</Tag>
            ) : (
              <Tag color="default" icon={<CloseCircleOutlined />}>No</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="RS Rating">
            <Text strong>{summary.rsRating}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Pullback Status">
            <Tag color={summary.inPullback ? 'warning' : 'default'}>
              {summary.inPullback ? 'In Pullback' : 'Not in Pullback'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Pullbacks">
            {summary.pullbackCount} times
          </Descriptions.Item>
          <Descriptions.Item label="From 52W High">
            {formatPercent(summary.distFrom52WeekHigh, true)}
          </Descriptions.Item>
          <Descriptions.Item label="From 52W Low">
            {formatPercent(summary.distFrom52WeekLow, true)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Placeholder for future sections */}
      <Card title="Contraction Stages" className={styles.sectionCard}>
        <Text type="secondary">Contraction stage details will be implemented in the next phase...</Text>
      </Card>

      <Card title="Pullback Stages" className={styles.sectionCard}>
        <Text type="secondary">Pullback stage details will be implemented in the next phase...</Text>
      </Card>

      <Card title="Recent K-Line Data" className={styles.sectionCard}>
        <Text type="secondary">K-line data will be implemented in the next phase...</Text>
      </Card>

      <Card title="Trend Template Check" className={styles.sectionCard}>
        <Text type="secondary">Trend template check details will be implemented in the next phase...</Text>
      </Card>
    </div>
  );
}
