import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Tag, Tooltip, Card, Collapse } from 'antd';
import type { VcpDetailResponse } from '../../types/vcp';
import styles from './VcpIndicator.module.css';

const { Panel } = Collapse;

interface VcpIndicatorProps {
  data: VcpDetailResponse | null;
  loading: boolean;
  error: Error | null;
}

export function VcpIndicator({ data, loading, error }: VcpIndicatorProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <Card size="small" className={styles.card}>
          <div className={styles.loadingContainer}>
            <LoadingOutlined /> 检测 VCP 形态中...
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Card size="small" className={styles.card}>
          <div className={styles.errorContainer}>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> VCP 数据加载失败
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <Card size="small" className={styles.card}>
          <div className={styles.noVcpContainer}>
            <CloseCircleOutlined style={{ color: '#8c8c8c' }} /> 
            <span className={styles.noVcpText}>未检测到 VCP 形态</span>
          </div>
        </Card>
      </div>
    );
  }

  const passedChecks = data.trendTemplate.checks.filter(c => c.pass).length;
  const totalChecks = data.trendTemplate.checks.length;
  const isVcpPattern = data.trendTemplate.allPass && data.contractionCount >= 3;

  return (
    <div className={styles.container}>
      <Card size="small" className={styles.card}>
        <div className={styles.header}>
          <div className={styles.statusSection}>
            {isVcpPattern ? (
              <>
                <CheckCircleOutlined className={styles.passIcon} />
                <span className={styles.statusText}>符合 VCP 形态</span>
              </>
            ) : (
              <>
                <CloseCircleOutlined className={styles.failIcon} />
                <span className={styles.statusText}>不符合 VCP 形态</span>
              </>
            )}
          </div>
          <Tag color={data.volumeDryingUp ? 'green' : 'default'}>
            {data.volumeDryingUp ? '缩量' : '未缩量'}
          </Tag>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>收缩次数</span>
            <span className={styles.metricValue}>
              {data.contractionCount}
              {data.contractionCount >= 3 && (
                <CheckCircleOutlined className={styles.metricPassIcon} />
              )}
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>最后收缩幅度</span>
            <span className={styles.metricValue}>{data.lastContractionPct.toFixed(2)}%</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>RS 评级</span>
            <Tooltip title="相对强度评级 (1-100)">
              <span className={styles.metricValue}>
                {data.rsRating}
                {data.rsRating >= 70 && (
                  <CheckCircleOutlined className={styles.metricPassIcon} />
                )}
              </span>
            </Tooltip>
          </div>
        </div>

        <Collapse ghost className={styles.collapse} defaultActiveKey={data.pullbacks && data.pullbacks.length > 0 ? ['pullbacks'] : []}>
          {data.pullbacks && data.pullbacks.length > 0 && (
            <Panel 
              header={
                <span className={styles.panelHeader} style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  🎯 上涨回调 ({data.pullbacks.length}) {data.pullbacks[0].isInUptrend && '· 上涨趋势中'}
                </span>
              } 
              key="pullbacks"
            >
              <div className={styles.pullbackList}>
                {data.pullbacks.map((pullback, index) => (
                  <div key={index} className={styles.pullbackItem}>
                    <div className={styles.pullbackHeader}>
                      <span className={styles.pullbackIndex}>回调 #{pullback.index}</span>
                      <Tag color={pullback.pullbackPct < 5 ? 'green' : pullback.pullbackPct < 10 ? 'blue' : 'orange'}>
                        回调 {pullback.pullbackPct.toFixed(2)}%
                      </Tag>
                    </div>
                    <div className={styles.pullbackDetails}>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>高点:</span>
                        <span>{new Date(pullback.highDate).toLocaleDateString()} - ¥{pullback.highPrice.toFixed(2)}</span>
                      </div>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>低点:</span>
                        <span>{new Date(pullback.lowDate).toLocaleDateString()} - ¥{pullback.lowPrice.toFixed(2)}</span>
                      </div>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>持续:</span>
                        <span>{pullback.durationDays} 天</span>
                      </div>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>成交量:</span>
                        <span>{(pullback.avgVolume / 10000).toFixed(0)}万 手/天</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.pullbackTip}>
                <span>💡 提示: 上涨趋势中的回调可能是买入机会</span>
              </div>
            </Panel>
          )}
          
          <Panel 
            header={
              <span className={styles.panelHeader}>
                趋势模板检查 ({passedChecks}/{totalChecks})
              </span>
            } 
            key="trend-template"
          >
            <div className={styles.checkList}>
              {data.trendTemplate.checks.map((check, index) => (
                <div key={index} className={styles.checkItem}>
                  <div className={styles.checkHeader}>
                    {check.pass ? (
                      <CheckCircleOutlined className={styles.checkPassIcon} />
                    ) : (
                      <CloseCircleOutlined className={styles.checkFailIcon} />
                    )}
                    <span className={styles.checkLabel}>{check.label}</span>
                  </div>
                  <div className={styles.checkDetails}>
                    <span>当前值: {check.currentValue.toFixed(2)}</span>
                    <span>阈值: {check.threshold.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel 
            header={
              <span className={styles.panelHeader}>
                收缩详情 ({data.contractions.length})
              </span>
            } 
            key="contractions"
          >
            <div className={styles.contractionList}>
              {data.contractions.map((contraction, index) => (
                <div key={index} className={styles.contractionItem}>
                  <div className={styles.contractionHeader}>
                    <span className={styles.contractionIndex}>收缩 #{contraction.index}</span>
                    <Tag color={contraction.depthPct < 0 ? 'red' : 'green'}>
                      {contraction.depthPct.toFixed(2)}%
                    </Tag>
                  </div>
                  <div className={styles.contractionDetails}>
                    <div className={styles.contractionRow}>
                      <span className={styles.contractionLabel}>高点:</span>
                      <span>{new Date(contraction.swingHighDate).toLocaleDateString()} - ¥{contraction.swingHighPrice.toFixed(2)}</span>
                    </div>
                    <div className={styles.contractionRow}>
                      <span className={styles.contractionLabel}>低点:</span>
                      <span>{new Date(contraction.swingLowDate).toLocaleDateString()} - ¥{contraction.swingLowPrice.toFixed(2)}</span>
                    </div>
                    <div className={styles.contractionRow}>
                      <span className={styles.contractionLabel}>持续:</span>
                      <span>{contraction.durationDays} 天</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>

        <div className={styles.footer}>
          <span className={styles.scanDate}>扫描日期: {data.scanDate}</span>
        </div>
      </Card>
    </div>
  );
}
