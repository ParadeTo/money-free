/**
 * VcpTooltip Component
 * Displays detailed information when hovering over VCP lines
 */

import { useMemo } from 'react';
import type { VcpLineData } from '../../types/vcp';
import { formatTooltipContent } from '../../utils/vcpOverlayHelpers';
import styles from './VcpTooltip.module.css';

export interface VcpTooltipProps {
  /** Line data to display */
  line: VcpLineData | null;

  /** Tooltip position */
  position: { x: number; y: number };

  /** Chart container bounds */
  chartBounds: DOMRect | null;

  /** Visibility */
  visible: boolean;
}

export function VcpTooltip({ line, position, chartBounds, visible }: VcpTooltipProps) {
  const content = useMemo(() => {
    if (!line) return null;
    return formatTooltipContent(line);
  }, [line]);

  const adjustedPosition = useMemo(() => {
    if (!chartBounds || !visible || !content) {
      return { x: -9999, y: -9999 };
    }

    // Estimate tooltip size
    const tooltipWidth = 280;
    const tooltipHeight = content.additionalInfo ? 220 : 160;

    let x = position.x + 10;
    let y = position.y + 10;

    // Right edge overflow → move to left of mouse
    if (x + tooltipWidth > chartBounds.right) {
      x = position.x - tooltipWidth - 10;
    }

    // Bottom edge overflow → move above mouse
    if (y + tooltipHeight > chartBounds.bottom) {
      y = position.y - tooltipHeight - 10;
    }

    // Left edge overflow → stick to left boundary
    if (x < chartBounds.left) {
      x = chartBounds.left + 5;
    }

    // Top edge overflow → stick to top boundary
    if (y < chartBounds.top) {
      y = chartBounds.top + 5;
    }

    return { x, y };
  }, [position, chartBounds, visible, content]);

  if (!visible || !content || !line) {
    return null;
  }

  const lineColor = line.type === 'contraction' ? '#2563eb' : 
                    line.status === 'active' ? '#fb923c' : '#f59e0b';

  return (
    <div
      className={styles.tooltip}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        borderLeftColor: lineColor,
      }}
    >
      <div className={styles.title} style={{ color: lineColor }}>
        {content.title}
      </div>

      <div className={styles.content}>
        <div className={styles.row}>
          <span className={styles.label}>Depth:</span>
          <span className={styles.value}>{content.depth.replace('Depth: ', '')}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Duration:</span>
          <span className={styles.value}>{content.duration.replace('Duration: ', '')}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Volume:</span>
          <span className={styles.value}>{content.avgVolume.replace('Avg Volume: ', '')}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          <span className={styles.label}>Period:</span>
          <span className={styles.value}>{content.dateRange}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Price:</span>
          <span className={styles.value}>{content.priceRange}</span>
        </div>

        {content.additionalInfo && (
          <>
            <div className={styles.divider} />
            {content.additionalInfo.map((info, index) => (
              <div key={index} className={styles.additionalRow}>
                {info}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
