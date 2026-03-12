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
            <LoadingOutlined /> Detecting VCP pattern...
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
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Failed to load VCP data
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
            <span className={styles.noVcpText}>No VCP pattern detected</span>
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
                <span className={styles.statusText}>Valid VCP Pattern</span>
              </>
            ) : (
              <>
                <CloseCircleOutlined className={styles.failIcon} />
                <span className={styles.statusText}>Invalid VCP Pattern</span>
              </>
            )}
          </div>
          <Tag color={data.volumeDryingUp ? 'green' : 'default'}>
            {data.volumeDryingUp ? 'Volume Dry Up' : 'No Dry Up'}
          </Tag>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Contractions</span>
            <span className={styles.metricValue}>
              {data.contractionCount}
              {data.contractionCount >= 3 && (
                <CheckCircleOutlined className={styles.metricPassIcon} />
              )}
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Last Contraction</span>
            <span className={styles.metricValue}>{data.lastContractionPct.toFixed(2)}%</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>RS Rating</span>
            <Tooltip title="Relative Strength Rating (1-100)">
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
                  🎯 Pullbacks ({data.pullbacks.length}) {data.pullbacks[0].isInUptrend && '· In Uptrend'}
                </span>
              } 
              key="pullbacks"
            >
              <div className={styles.pullbackList}>
                {data.pullbacks.map((pullback, index) => (
                  <div key={index} className={styles.pullbackItem}>
                    <div className={styles.pullbackHeader}>
                      <span className={styles.pullbackIndex}>Pullback #{pullback.index}</span>
                      <Tag color={pullback.pullbackPct < 5 ? 'green' : pullback.pullbackPct < 10 ? 'blue' : 'orange'}>
                        Pullback {pullback.pullbackPct.toFixed(2)}%
                      </Tag>
                    </div>
                    <div className={styles.pullbackDetails}>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>High:</span>
                        <span>{new Date(pullback.highDate).toLocaleDateString()} - ¥{pullback.highPrice.toFixed(2)}</span>
                      </div>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>Low:</span>
                        <span>{new Date(pullback.lowDate).toLocaleDateString()} - ¥{pullback.lowPrice.toFixed(2)}</span>
                      </div>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>Duration:</span>
                        <span>{pullback.durationDays} days</span>
                      </div>
                      <div className={styles.pullbackRow}>
                        <span className={styles.pullbackLabel}>Volume:</span>
                        <span>{(pullback.avgVolume / 10000).toFixed(0)}K shares/day</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.pullbackTip}>
                <span>💡 Tip: Pullbacks in uptrend may be buying opportunities</span>
              </div>
            </Panel>
          )}
          
          <Panel 
            header={
              <span className={styles.panelHeader}>
                Trend Template Checks ({passedChecks}/{totalChecks})
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
                    <span>Current: {check.currentValue.toFixed(2)}</span>
                    <span>Threshold: {check.threshold.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel 
            header={
              <span className={styles.panelHeader}>
                Contraction Details ({data.contractions.length})
              </span>
            } 
            key="contractions"
          >
            <div className={styles.contractionList}>
              {data.contractions.map((contraction, index) => (
                <div key={index} className={styles.contractionItem}>
                  <div className={styles.contractionHeader}>
                    <span className={styles.contractionIndex}>Contraction #{contraction.index}</span>
                    <Tag color={contraction.depthPct < 0 ? 'red' : 'green'}>
                      {contraction.depthPct.toFixed(2)}%
                    </Tag>
                  </div>
                  <div className={styles.contractionDetails}>
                    <div className={styles.contractionRow}>
                      <span className={styles.contractionLabel}>High:</span>
                      <span>{new Date(contraction.swingHighDate).toLocaleDateString()} - ¥{contraction.swingHighPrice.toFixed(2)}</span>
                    </div>
                    <div className={styles.contractionRow}>
                      <span className={styles.contractionLabel}>Low:</span>
                      <span>{new Date(contraction.swingLowDate).toLocaleDateString()} - ¥{contraction.swingLowPrice.toFixed(2)}</span>
                    </div>
                    <div className={styles.contractionRow}>
                      <span className={styles.contractionLabel}>Duration:</span>
                      <span>{contraction.durationDays} days</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>

        <div className={styles.footer}>
          <span className={styles.scanDate}>Scan Date: {data.scanDate}</span>
        </div>
      </Card>
    </div>
  );
}
