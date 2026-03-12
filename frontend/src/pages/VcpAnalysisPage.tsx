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
        <Spin size="large" tip="正在加载VCP分析数据..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="加载失败"
          description={error.message || '无法加载VCP分析数据，请稍后重试'}
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
          message="无数据"
          description="未找到该股票的VCP分析数据"
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
              VCP形态: {hasVcp ? '有效' : '无效'}
            </Tag>
            {cached && <Tag color="blue">来源: 缓存</Tag>}
          </Space>
        </div>
        <div className={styles.headerRight}>
          <Text type="secondary">扫描日期: {formatScanDate(scanDate)}</Text>
          {isExpired && (
            <Alert
              message="数据已过期"
              description={`分析数据已超过7天（${formatScanDate(scanDate)}），建议重新扫描`}
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
      <Card title="概览" className={styles.summaryCard}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
          <Descriptions.Item label="最新价格">
            ¥{formatPrice(summary.latestPrice)}
            <Text type={summary.priceChangePct >= 0 ? 'success' : 'danger'} className={styles.changeText}>
              ({formatPercent(summary.priceChangePct, true)})
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="收缩阶段数">
            {summary.contractionCount} 次
          </Descriptions.Item>
          <Descriptions.Item label="最后收缩幅度">
            {formatPercent(summary.lastContractionPct)}
          </Descriptions.Item>
          <Descriptions.Item label="成交量萎缩">
            {summary.volumeDryingUp ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>是</Tag>
            ) : (
              <Tag color="default" icon={<CloseCircleOutlined />}>否</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="RS评分">
            <Text strong>{summary.rsRating}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="回调状态">
            <Tag color={summary.inPullback ? 'warning' : 'default'}>
              {summary.inPullback ? '处于回调中' : '未在回调'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="回调次数">
            {summary.pullbackCount} 次
          </Descriptions.Item>
          <Descriptions.Item label="距52周高点">
            {formatPercent(summary.distFrom52WeekHigh, true)}
          </Descriptions.Item>
          <Descriptions.Item label="距52周低点">
            {formatPercent(summary.distFrom52WeekLow, true)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Placeholder for future sections */}
      <Card title="收缩阶段" className={styles.sectionCard}>
        <Text type="secondary">收缩阶段详情将在下一阶段实现...</Text>
      </Card>

      <Card title="回调阶段" className={styles.sectionCard}>
        <Text type="secondary">回调阶段详情将在下一阶段实现...</Text>
      </Card>

      <Card title="最近K线数据" className={styles.sectionCard}>
        <Text type="secondary">K线数据将在下一阶段实现...</Text>
      </Card>

      <Card title="趋势模板检查" className={styles.sectionCard}>
        <Text type="secondary">趋势模板检查详情将在下一阶段实现...</Text>
      </Card>
    </div>
  );
}
