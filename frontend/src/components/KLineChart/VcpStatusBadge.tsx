/**
 * VcpStatusBadge Component
 * Compact display of overall VCP analysis status
 */

import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import type { VcpAnalysis } from '../../types/vcp';
import styles from './VcpStatusBadge.module.css';

export interface VcpStatusBadgeProps {
  /** VCP analysis data */
  vcpData: VcpAnalysis | null;

  /** Visibility */
  visible: boolean;
}

export function VcpStatusBadge({ vcpData, visible }: VcpStatusBadgeProps) {
  if (!visible || !vcpData || !vcpData.summary || !vcpData.trendTemplate) {
    return null;
  }

  const { summary, trendTemplate } = vcpData;
  
  // Additional safety checks
  if (!summary || !trendTemplate || !trendTemplate.checks) {
    return null;
  }

  const isValidVcp = trendTemplate.pass && summary.contractionCount >= 3;
  const passedChecks = trendTemplate.checks.filter((c) => c.pass).length;
  const totalChecks = trendTemplate.checks.length;

  return (
    <div className={styles.badge}>
      <div className={styles.status}>
        {isValidVcp ? (
          <CheckCircleOutlined className={styles.passIcon} />
        ) : (
          <CloseCircleOutlined className={styles.failIcon} />
        )}
        <span className={styles.statusText}>
          {isValidVcp ? 'Valid VCP' : 'Invalid VCP'}
        </span>
      </div>

      <div className={styles.metrics}>
        <Tooltip title="Relative Strength Rating (70+ is strong)">
          <Tag color={summary.rsRating >= 70 ? 'green' : 'default'} className={styles.tag}>
            RS: {summary.rsRating}
          </Tag>
        </Tooltip>

        <Tooltip title="Volume Dry Up indicates reduced selling pressure">
          <Tag color={summary.volumeDryingUp ? 'blue' : 'default'} className={styles.tag}>
            {summary.volumeDryingUp ? '✓ Vol Dry' : '✗ Vol Dry'}
          </Tag>
        </Tooltip>

        <Tooltip title={`Trend Template: ${passedChecks}/${totalChecks} checks passed`}>
          <Tag color={trendTemplate.pass ? 'green' : 'orange'} className={styles.tag}>
            Trend: {passedChecks}/{totalChecks}
          </Tag>
        </Tooltip>

        <Tag className={styles.tag}>
          C: {summary.contractionCount}
        </Tag>

        {summary.pullbackCount > 0 && (
          <Tooltip title={summary.inPullback ? 'Currently in pullback - potential buy zone' : 'Pullbacks detected'}>
            <Tag color={summary.inPullback ? 'blue' : 'default'} className={styles.tag}>
              {summary.inPullback ? '🎯 ' : ''}P: {summary.pullbackCount}
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
