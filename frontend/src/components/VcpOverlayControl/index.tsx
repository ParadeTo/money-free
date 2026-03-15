/**
 * VcpOverlayControl Component
 * T039: Toggle button for VCP overlay visibility
 */

import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useChartStore } from '../../store/chart.store';
import styles from './VcpOverlayControl.module.css';

export interface VcpOverlayControlProps {
  /** Optional custom position */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  /** Disabled state */
  disabled?: boolean;
}

/**
 * Toggle control for VCP overlay visibility
 */
export function VcpOverlayControl({
  position = 'top-right',
  disabled = false,
}: VcpOverlayControlProps) {
  const vcpOverlayVisible = useChartStore((state) => state.vcpOverlayVisible);
  const toggleVcpOverlay = useChartStore((state) => state.toggleVcpOverlay);

  const handleToggle = () => {
    if (!disabled) {
      toggleVcpOverlay();
    }
  };

  const tooltipText = vcpOverlayVisible ? 'Hide VCP Overlay' : 'Show VCP Overlay';

  return (
    <div className={`${styles.control} ${styles[position]}`}>
      <Tooltip title={tooltipText} placement="left">
        <Button
          type={vcpOverlayVisible ? 'primary' : 'default'}
          icon={vcpOverlayVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={handleToggle}
          disabled={disabled}
          size="small"
          className={styles.toggleButton}
          data-testid="vcp-overlay-toggle"
        >
          VCP
        </Button>
      </Tooltip>
    </div>
  );
}
